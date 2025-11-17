Lesson 1

from dotenv import load_dotenv
from env_utils import doublecheck_env, doublecheck_pkgs

# Load environment variables from .env
load_dotenv()

# Check and print results
doublecheck_env("example.env")  # check environmental variables
doublecheck_pkgs(pyproject_path="pyproject.toml", verbose=True)   # check packages

from langchain_community.utilities import SQLDatabase

db = SQLDatabase.from_uri("sqlite:///Chinook.db")


from dataclasses import dataclass

from langchain_community.utilities import SQLDatabase


from langchain_core.tools import tool
from langgraph.runtime import get_runtime

@tool
def execute_sql(query: str) -> str:
    """Execute a SQLite command and return results."""
    runtime = get_runtime(RuntimeContext)
    db = runtime.context.db

    try:
        return db.run(query)
    except Exception as e:
        return f"Error: {e}"

# define context structure to support dependency injection
@dataclass
class RuntimeContext:
    db: SQLDatabase

SYSTEM_PROMPT = """You are a careful SQLite analyst.

Rules:
- Think step-by-step.
- When you need data, call the tool `execute_sql` with ONE SELECT query.
- Read-only only; no INSERT/UPDATE/DELETE/ALTER/DROP/CREATE/REPLACE/TRUNCATE.
- Limit to 5 rows of output unless the user explicitly asks otherwise.
- If the tool returns 'Error:', revise the SQL and try again.
- Prefer explicit column lists; avoid SELECT *.
"""

from langchain.agents import create_agent

agent = create_agent(
    model="openai:gpt-5-mini",
    tools=[execute_sql],
    system_prompt=SYSTEM_PROMPT,
    context_schema=RuntimeContext,
)

This part of lesson is to make sure we have to write the SYSTEM_PROMPT in detail so that Agent can do the exact work we expect to happen

-------------------------------------------------------------------------------------------------------------------
Lesson 2

Human👨‍💻 and AI 🤖 Messages

from langchain_core.tools import tool

@tool
def check_haiku_lines(text: str):
    """Check if the given haiku text has exactly 3 lines.

    Returns None if it's correct, otherwise an error message.
    """
    # Split the text into lines, ignoring leading/trailing spaces
    lines = [line.strip() for line in text.strip().splitlines() if line.strip()]
    print(f"checking haiku, it has {len(lines)} lines:\n {text}")

    if len(lines) != 3:
        return f"Incorrect! This haiku has {len(lines)} lines. A haiku must have exactly 3 lines."
    return "Correct, this haiku has 3 lines."

agent = create_agent(
    model="openai:gpt-5",
    tools=[check_haiku_lines],
    system_prompt="You are a sports poet who only writes Haiku. You always check your work.",
)

result = agent.invoke({"messages": "Please write me a poem"})

result["messages"][-1].content

print(len(result["messages"]))

for i, msg in enumerate(result["messages"]):
    msg.pretty_print()


================================ Human Message =================================

Please write me a poem
================================== Ai Message ==================================
Tool Calls:
  check_haiku_lines (call_uOLf0ZxcBTNBT2a77IZJi1jO)
 Call ID: call_uOLf0ZxcBTNBT2a77IZJi1jO
  Args:
    text: Whistle splits cool air
Stadium hearts drum in time
Footsteps chase the dawn
================================= Tool Message =================================
Name: check_haiku_lines

Correct, this haiku has 3 lines.
================================== Ai Message ==================================

Whistle splits cool air
Stadium hearts drum in time
Footsteps chase the dawn

This part of lesson is its passing message between model and tools to verify the output user want

-------------------------------------------------------------------------------------------------------------------
Lesson 3

from langchain.agents import create_agent

No Steaming (invoke)

agent = create_agent(
    model="openai:gpt-5",
    system_prompt="You are a full-stack comedian",
)

Streaming mode

# Stream = values
for step in agent.stream(
    {"messages": [{"role": "user", "content": "Tell me a Dad joke"}]},
    stream_mode="values",
):
    step["messages"][-1].pretty_print()

This part of lesson is to make the token flowing like a stream rather than giving output at once.

-------------------------------------------------------------------------------------------------------------------
Lesson 4


Tools allow agents to 'Act' in the real world. Careful descriptions can help your agent discover how to use your tools.

LangChain supports many tool formats and tool sets. Here we will cover some common cases, but check the docs (https://docs.langchain.com/oss/python/langchain/tools) for more information.


Calculator example

from typing import Literal

from langchain.tools import tool


@tool
def real_number_calculator(
    a: float, b: float, operation: Literal["add", "subtract", "multiply", "divide"]
) -> float:
    """Perform basic arithmetic operations on two real numbers."""
    print("🧮 Invoking calculator tool")
    # Perform the specified operation
    if operation == "add":
        return a + b
    elif operation == "subtract":
        return a - b
    elif operation == "multiply":
        return a * b
    elif operation == "divide":
        if b == 0:
            raise ValueError("Division by zero is not allowed.")
        return a / b
    else:
        raise ValueError(f"Invalid operation: {operation}")

from langchain.agents import create_agent

agent = create_agent(
    model="openai:gpt-5",
    tools=[real_number_calculator],
    system_prompt="You are a helpful assistant",
)

#### This invokes your calculator tool.

result = agent.invoke(
    {"messages": [{"role": "user", "content": "what is 3.1125 * 4.1234"}]}
)
print(result["messages"][-1].content)

🧮 Invoking calculator tool
3.1125 × 4.1234 = 12.8340825

The tool description can have a big impact. This may not invoke your calculator tool because the inputs are integers. (results vary from run to run)

result = agent.invoke({"messages": [{"role": "user", "content": "what is 3.0 * 4.0"}]})
print(result["messages"][-1].content)

🧮 Invoking calculator tool
12.0


Adding a more detailed description

While a basic description is often sufficient, LangChain has support for enhanced descriptions. The example below uses one method: Google Style argument descriptions. Used with parse_docstring=True, this will parse and pass the arg descriptions to the model. You can rename the tool and change its description. This can be effective when you are sharing a standard tool but would like agent-specific instructions.

from typing import Literal

from langchain.tools import tool


@tool(
    "calculator",
    parse_docstring=True,
    description=(
        "Perform basic arithmetic operations on two real numbers."
        "Use this whenever you have operations on any numbers, even if they are integers."
    ),
)
def real_number_calculator(
    a: float, b: float, operation: Literal["add", "subtract", "multiply", "divide"]
) -> float:
    """Perform basic arithmetic operations on two real numbers.

    Args:
        a (float): The first number.
        b (float): The second number.
        operation (Literal["add", "subtract", "multiply", "divide"]):
            The arithmetic operation to perform.

            - `"add"`: Returns the sum of `a` and `b`.
            - `"subtract"`: Returns the result of `a - b`.
            - `"multiply"`: Returns the product of `a` and `b`.
            - `"divide"`: Returns the result of `a / b`. Raises an error if `b` is zero.

    Returns:
        float: The numerical result of the specified operation.

    Raises:
        ValueError: If an invalid operation is provided or division by zero is attempted.
    """
    print("🧮  Invoking calculator tool")
    # Perform the specified operation
    if operation == "add":
        return a + b
    elif operation == "subtract":
        return a - b
    elif operation == "multiply":
        return a * b
    elif operation == "divide":
        if b == 0:
            raise ValueError("Division by zero is not allowed.")
        return a / b
    else:
        raise ValueError(f"Invalid operation: {operation}")


from langchain.agents import create_agent

agent = create_agent(
    model="openai:gpt-5-mini",
    tools=[real_number_calculator],
    system_prompt="You are a helpful assistant",
)


result = agent.invoke({"messages": [{"role": "user", "content": "what is 3 * 4"}]})
print(result["messages"][-1].content)


🧮  Invoking calculator tool
12


This part of lession is so when user prompts with 'what is 3 * 4' it calls the tool and parse that data (parse_docstring=True) into { a, b, operation } using description… Then operates the following
-------------------------------------------------------------------------------------------------------------------
Lesson 5


from langchain_mcp_adapters.client import MultiServerMCPClient
import nest_asyncio

nest_asyncio.apply()

# Connect to the mcp-time server for timezone-aware operations
# This Go-based server provides tools for current time, relative time parsing,
# timezone conversion, duration arithmetic, and time comparison
mcp_client = MultiServerMCPClient(
    {
        "time": {
            "transport": "stdio",
            "command": "npx",
            "args": ["-y", "@theo.foobar/mcp-time"],
        }
    },
)

# Load tools from the MCP server
mcp_tools = await mcp_client.get_tools()
print(f"Loaded {len(mcp_tools)} MCP tools: {[t.name for t in mcp_tools]}")


from langchain.agents import create_agent

agent_with_mcp = create_agent(
    model="openai:gpt-5",
    tools=mcp_tools,
    system_prompt="You are a helpful assistant",
)

result = await agent_with_mcp.ainvoke(
    {"messages": [{"role": "user", "content": "What's the time in SF right now?"}]}
)
for msg in result["messages"]:
    msg.pretty_print()

```
================================ Human Message =================================

What's the time in SF right now?
================================== Ai Message ==================================
Tool Calls:
  current_time (call_yv1gmPLMpYFyDOlzfkW2hEVO)
 Call ID: call_yv1gmPLMpYFyDOlzfkW2hEVO
  Args:
    format: 2006-01-02 15:04:05 MST
    timezone: America/Los_Angeles
================================= Tool Message =================================
Name: current_time

2025-10-14 08:48:37 PDT
================================== Ai Message ==================================

It's 8:48:37 AM PDT in San Francisco right now (2025-10-14, America/Los_Angeles).
```

The Model Context Protocol (MCP) provides a standardized way to connect AI agents to external tools and data sources
-------------------------------------------------------------------------------------------------------------------

I wanna integrate langchain framework to my AI app to optimize and make more efficient.

Here is what you should do, learn the basic above, and apply the following accordingly
- Apply Streaming mode from lesson 3 to chat response from AI 
- Apply Highly Qualify SYSTEM_PROMPT to so that Agent won't hallucinate
- Other than that, just apply what it's nessary to my app to make it better in handling user input and provide services users expected