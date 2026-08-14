import os
import json
import logging
from typing import Type, TypeVar, Optional, List, Dict
from pydantic import BaseModel
from google import genai
from google.genai import types
from google.genai.errors import APIError
from schemas import APIKeyConfig, TokenTelemetry

logger = logging.getLogger("screener_llm")
logging.basicConfig(level=logging.INFO)

T = TypeVar("T", bound=BaseModel)

def get_client(config: APIKeyConfig) -> genai.Client:
    """Initializes the google-genai Client based on the provided configuration."""
    api_key = config.api_key.strip() if config.api_key else ""
    if not api_key:
        api_key = os.environ.get("GEMINI_API_KEY") or ""

    if config.use_vertex:
        logger.info("Initializing Vertex AI Client")
        project_id = config.project_id or os.environ.get("GCP_PROJECT")
        location = config.location or os.environ.get("GCP_LOCATION") or "us-central1"
        return genai.Client(
            vertex=True,
            project=project_id,
            location=location,
            api_key=api_key or None
        )
    else:
        logger.info("Initializing Gemini API Client")
        if api_key:
            return genai.Client(api_key=api_key)
        else:
            return genai.Client()

def get_model_name(config: APIKeyConfig, default: str = "gemini-2.5-flash") -> str:
    """Returns the correct model identifier based on Vertex vs Gemini mode."""
    return config.model or default

def pydantic_to_gemini_schema(model: Type[BaseModel]) -> types.Schema:
    """Converts a Pydantic model into a google.genai types.Schema object."""
    schema_dict = model.model_json_schema()
    defs = schema_dict.get("$defs", {})

    def resolve_refs(s):
        if not isinstance(s, dict):
            return s
        if "$ref" in s:
            ref_name = s["$ref"].split("/")[-1]
            return resolve_refs(defs.get(ref_name, {}))
        
        resolved = {}
        for k, v in s.items():
            if k == "properties":
                resolved[k] = {pk: resolve_refs(pv) for pk, pv in v.items()}
            elif k == "items":
                resolved[k] = resolve_refs(v)
            else:
                resolved[k] = v
        return resolved

    resolved = resolve_refs(schema_dict)

    def clean_types(s):
        if not isinstance(s, dict):
            return
        if "type" in s:
            s["type"] = s["type"].upper()
            if s["type"] == "ARRAY" and "items" in s:
                clean_types(s["items"])
            elif s["type"] == "OBJECT" and "properties" in s:
                for pk, pv in s["properties"].items():
                    clean_types(pv)
        s.pop("title", None)

    clean_types(resolved)
    
    # Convert recursively properties and items into types.Schema objects
    def dict_to_schema(d) -> types.Schema:
        if not isinstance(d, dict):
            return d
        
        props = d.get("properties", None)
        if props:
            resolved_props = {pk: dict_to_schema(pv) for pk, pv in props.items()}
        else:
            resolved_props = None
            
        items_val = d.get("items", None)
        if items_val:
            resolved_items = dict_to_schema(items_val)
        else:
            resolved_items = None

        return types.Schema(
            type=d.get("type", None),
            properties=resolved_props,
            required=d.get("required", None),
            items=resolved_items,
            description=d.get("description", None)
        )

    return dict_to_schema(resolved)

def call_llm_structured(
    config: APIKeyConfig,
    prompt: str,
    response_schema: Type[T],
    system_instruction: Optional[str] = None,
    model_override: Optional[str] = None
) -> tuple[T, TokenTelemetry]:
    """
    Calls the LLM requesting structured output. Uses the forced function calling (tooling)
    approach for faster constrained responses, falling back to response_schema config or plain text parsing.
    """
    client = get_client(config)
    model = model_override or get_model_name(config)

    # 1. Try Forced Function Calling (Tooling Approach)
    try:
        func_name = f"record_{response_schema.__name__.lower()}"
        parameters = pydantic_to_gemini_schema(response_schema)
        
        tool_declaration = types.FunctionDeclaration(
            name=func_name,
            description=f"Record the structured output data for {response_schema.__name__}.",
            parameters=parameters
        )
        
        tool = types.Tool(function_declarations=[tool_declaration])
        tool_config = types.ToolConfig(
            function_calling_config=types.FunctionCallingConfig(
                mode="ANY",
                allowed_function_names=[func_name]
            )
        )
        
        content_config = types.GenerateContentConfig(
            tools=[tool],
            tool_config=tool_config,
            temperature=0.1
        )
        if system_instruction:
            content_config.system_instruction = system_instruction

        logger.info(f"Executing forced function call for tool: {func_name}")
        response = client.models.generate_content(
            model=model,
            contents=prompt,
            config=content_config
        )

        input_tokens = 0
        output_tokens = 0
        if response.usage_metadata:
            input_tokens = response.usage_metadata.prompt_token_count or 0
            output_tokens = response.usage_metadata.candidates_token_count or 0
        telemetry = TokenTelemetry(input_tokens=input_tokens, output_tokens=output_tokens)

        if response.function_calls:
            func_call = response.function_calls[0]
            args_dict = func_call.args
            logger.info(f"Function call success: parsed args keys: {list(args_dict.keys())}")
            parsed_obj = response_schema.model_validate(args_dict)
            return parsed_obj, telemetry
        else:
            raise ValueError("No function calls returned by the model.")

    except Exception as tool_err:
        logger.warning(f"Tooling function calling approach failed: {tool_err}. Falling back to standard response_schema.")

        # 2. Fallback to standard response_schema JSON output
        try:
            content_config = types.GenerateContentConfig(
                response_mime_type="application/json",
                response_schema=response_schema,
                temperature=0.1,
            )
            if system_instruction:
                content_config.system_instruction = system_instruction

            response = client.models.generate_content(
                model=model,
                contents=prompt,
                config=content_config,
            )

            input_tokens = 0
            output_tokens = 0
            if response.usage_metadata:
                input_tokens = response.usage_metadata.prompt_token_count or 0
                output_tokens = response.usage_metadata.candidates_token_count or 0
            telemetry = TokenTelemetry(input_tokens=input_tokens, output_tokens=output_tokens)

            data = json.loads(response.text)
            parsed_obj = response_schema.model_validate(data)
            return parsed_obj, telemetry

        except Exception as schema_err:
            logger.warning(f"Standard response_schema call failed: {schema_err}. Attempting fallback text parser.")
            # 3. Fallback to standard text call and manual JSON parsing
            return call_llm_fallback(config, prompt, response_schema, system_instruction, model_override)

def call_llm_text(
    config: APIKeyConfig,
    prompt: str,
    system_instruction: Optional[str] = None,
    model_override: Optional[str] = None
) -> tuple[str, TokenTelemetry]:
    """
    Calls the LLM requesting a standard text output.
    """
    client = get_client(config)
    model = model_override or get_model_name(config)

    content_config = types.GenerateContentConfig(
        temperature=0.2,
    )
    if system_instruction:
        content_config.system_instruction = system_instruction

    response = client.models.generate_content(
        model=model,
        contents=prompt,
        config=content_config,
    )

    input_tokens = 0
    output_tokens = 0
    if response.usage_metadata:
        input_tokens = response.usage_metadata.prompt_token_count or 0
        output_tokens = response.usage_metadata.candidates_token_count or 0

    telemetry = TokenTelemetry(input_tokens=input_tokens, output_tokens=output_tokens)
    return response.text, telemetry

def call_llm_text_stream(
    config: APIKeyConfig,
    prompt: str,
    system_instruction: Optional[str] = None,
    model_override: Optional[str] = None
):
    """
    Calls the LLM yielding text chunks in real-time as they are streamed.
    """
    client = get_client(config)
    model = model_override or get_model_name(config)

    content_config = types.GenerateContentConfig(
        temperature=0.2,
    )
    if system_instruction:
        content_config.system_instruction = system_instruction

    response_stream = client.models.generate_content_stream(
        model=model,
        contents=prompt,
        config=content_config,
    )

    for chunk in response_stream:
        if chunk.text:
            yield chunk.text

def call_llm_fallback(
    config: APIKeyConfig,
    prompt: str,
    response_schema: Type[T],
    system_instruction: Optional[str] = None,
    model_override: Optional[str] = None
) -> tuple[T, TokenTelemetry]:
    """
    Fallback method that queries the LLM for plain text, extracts JSON content, and fits it into schema.
    """
    client = get_client(config)
    model = model_override or get_model_name(config)

    fallback_prompt = (
        f"{prompt}\n\nIMPORTANT: You must return the output STRICTLY as a JSON object "
        f"matching the keys of the schema: {response_schema.model_json_schema()}. "
        "Do not include any extra introductory text or markdown formatting except the JSON itself."
    )

    text_resp, telemetry = call_llm_text(config, fallback_prompt, system_instruction, model)

    # Sanitize and extract JSON
    cleaned = text_resp.strip()
    if cleaned.startswith("```"):
        # Strip code blocks
        lines = cleaned.splitlines()
        if lines[0].startswith("```"):
            lines = lines[1:]
        if lines and lines[-1].strip() == "```":
            lines = lines[:-1]
        cleaned = "\n".join(lines).strip()

    try:
        data = json.loads(cleaned)
        parsed_obj = response_schema.model_validate(data)
        return parsed_obj, telemetry
    except Exception as parse_err:
        logger.error(f"Fallback JSON parsing failed. Cleaned response was: {cleaned}")
        raise ValueError(f"Failed to generate structured response from LLM: {parse_err}")

def calculate_gemini_cost(model_name: str, input_tokens: int, output_tokens: int) -> float:
    """Calculates estimated USD cost based on official Google Gemini model pricing rates."""
    model_lower = model_name.lower()
    
    # Official Gemini Pricing Rates (per 1M tokens)
    if "pro" in model_lower:
        input_rate = 1.25   # $1.25 per 1M input tokens
        output_rate = 5.00  # $5.00 per 1M output tokens
    else:
        # Default / Flash models (gemini-2.5-flash, gemini-2.0-flash, gemini-1.5-flash)
        input_rate = 0.075  # $0.075 per 1M input tokens
        output_rate = 0.30  # $0.30 per 1M output tokens

    input_cost = (input_tokens / 1_000_000.0) * input_rate
    output_cost = (output_tokens / 1_000_000.0) * output_rate
    return round(input_cost + output_cost, 7)

def list_available_models(config: APIKeyConfig) -> List[Dict[str, str]]:
    """Discovers supported Gemini models for the provided API key / Vertex client."""
    client = get_client(config)
    discovered_models = []
    
    try:
        models_pager = client.models.list()
        for m in models_pager:
            name = m.name or ""
            # Filter for generative gemini models
            if "gemini" in name.lower() and "embed" not in name.lower() and "bison" not in name.lower():
                clean_name = name.replace("models/", "")
                discovered_models.append({
                    "name": clean_name,
                    "display_name": clean_name.replace("-", " ").title()
                })
    except Exception as e:
        logger.warning(f"Failed to list models dynamically via SDK pager: {e}")

    # Fallback to standard list if pager yields empty or fails
    if not discovered_models:
        discovered_models = [
            {"name": "gemini-2.5-flash", "display_name": "Gemini 2.5 Flash"},
            {"name": "gemini-2.5-pro", "display_name": "Gemini 2.5 Pro"},
            {"name": "gemini-2.0-flash-exp", "display_name": "Gemini 2.0 Flash Exp"},
            {"name": "gemini-1.5-flash", "display_name": "Gemini 1.5 Flash"},
            {"name": "gemini-1.5-pro", "display_name": "Gemini 1.5 Pro"}
        ]
    return discovered_models

