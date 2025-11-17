Lesson 6

In Lesson 1, we don't integrate memory 


question = "This is Frank Harris, What was the total on my last invoice?"
steps = []

for step in agent.stream(
    {"messages": [{"role": "user", "content": question}]},
    stream_mode="values",
    context=RuntimeContext(db=db),
):
    step["messages"][-1].pretty_print()
    steps.append(step)

```
================================ Human Message =================================

This is Frank Harris, What was the total on my last invoice?
================================== Ai Message ==================================
Tool Calls:
  execute_sql (call_SPWacdQeKfaiUoanO3BWjy7H)
 Call ID: call_SPWacdQeKfaiUoanO3BWjy7H
  Args:
    query: SELECT name FROM sqlite_master WHERE type='table' ORDER BY name LIMIT 50;
================================= Tool Message =================================
Name: execute_sql

[('Album',), ('Artist',), ('Customer',), ('Employee',), ('Genre',), ('Invoice',), ('InvoiceLine',), ('MediaType',), ('Playlist',), ('PlaylistTrack',), ('Track',)]
================================== Ai Message ==================================
Tool Calls:
  execute_sql (call_i8pE95id3zcxIC872mUpq6Ug)
 Call ID: call_i8pE95id3zcxIC872mUpq6Ug
  Args:
    query: SELECT CustomerId, FirstName, LastName, Company, Email FROM Customer WHERE FirstName = 'Frank' AND LastName = 'Harris' LIMIT 5;
================================= Tool Message =================================
Name: execute_sql

[(16, 'Frank', 'Harris', 'Google Inc.', 'fharris@google.com')]
================================== Ai Message ==================================
Tool Calls:
  execute_sql (call_tp0ulQe2L3SK8uCKEeVlaryL)
 Call ID: call_tp0ulQe2L3SK8uCKEeVlaryL
  Args:
    query: SELECT InvoiceId, InvoiceDate, Total FROM Invoice WHERE CustomerId = 16 ORDER BY InvoiceDate DESC LIMIT 1;
================================= Tool Message =================================
Name: execute_sql

[(374, '2013-07-04 00:00:00', 5.94)]
================================== Ai Message ==================================

Your last invoice total was $5.94. (Invoice 374 dated 2013-07-04)
```

but when this question is asked

question = "What were the titles?"

for step in agent.stream(
    {"messages": [{"role": "user", "content": question}]},
    context=RuntimeContext(db=db),
    stream_mode="values",
):
    step["messages"][-1].pretty_print()

================================ Human Message =================================

What were the titles?
================================== Ai Message ==================================
Tool Calls:
  execute_sql (call_cmhGWD1P4Ta4WqeHaPGmq5ga)
 Call ID: call_cmhGWD1P4Ta4WqeHaPGmq5ga
  Args:
    query: SELECT name FROM sqlite_master WHERE type='table' ORDER BY name LIMIT 5;
================================= Tool Message =================================
Name: execute_sql

[('Album',), ('Artist',), ('Customer',), ('Employee',), ('Genre',)]
================================== Ai Message ==================================

Could you clarify which titles you mean—album titles, track titles, or something else? If you want album titles, I can list the first 5.


Add memory

from langgraph.checkpoint.memory import InMemorySaver


from langchain.agents import create_agent
from langchain_core.messages import SystemMessage

agent = create_agent(
    model="openai:gpt-5",
    tools=[execute_sql],
    system_prompt=SYSTEM_PROMPT,
    context_schema=RuntimeContext,
    checkpointer=InMemorySaver(),
)


question = "This is Frank Harris, What was the total on my last invoice?"
steps = []

for step in agent.stream(
    {"messages": [{"role": "user", "content": question}]},
    {"configurable": {"thread_id": "1"}},
    context=RuntimeContext(db=db),
    stream_mode="values",
):
    step["messages"][-1].pretty_print()
    steps.append(step)

question = "What were the titles?"
steps = []

for step in agent.stream(
    {"messages": [{"role": "user", "content": question}]},
    {"configurable": {"thread_id": "1"}},
    context=RuntimeContext(db=db),
    stream_mode="values",
):
    step["messages"][-1].pretty_print()
    steps.append(step)

================================ Human Message =================================

What were the titles?
================================== Ai Message ==================================
Tool Calls:
  execute_sql (call_NVIzXxF2vjAD1uAi2kI3CXl4)
 Call ID: call_NVIzXxF2vjAD1uAi2kI3CXl4
  Args:
    query: SELECT il.InvoiceLineId, t.Name AS Title
FROM InvoiceLine AS il
JOIN Track AS t ON t.TrackId = il.TrackId
WHERE il.InvoiceId = 374
ORDER BY il.InvoiceLineId
LIMIT 5;
================================= Tool Message =================================
Name: execute_sql

[(2021, 'Holier Than Thou'), (2022, 'Through The Never'), (2023, 'My Friend Of Misery'), (2024, 'The Wait'), (2025, 'Blitzkrieg')]
================================== Ai Message ==================================

The titles on your last invoice (ID 374) include:
- Holier Than Thou
- Through The Never
- My Friend Of Misery
- The Wait
- Blitzkrieg

Would you like the full list with quantities and prices?

This part of lesson is integrating short-term memory helps the agent understand the whole context of conversation.
-------------------------------------------------------------------------------------------------------------------
Lesson 7

Structured Output Example

from typing_extensions import TypedDict

from langchain.agents import create_agent


class ContactInfo(TypedDict):
    name: str
    email: str
    phone: str


agent = create_agent(model="openai:gpt-5-mini", response_format=ContactInfo)

recorded_conversation = """We talked with John Doe. He works over at Example. His number is, let's see, 
five, five, five, one two three, four, five, six seven. Did you get that?
And, his email was john at example.com. He wanted to order 50 boxes of Captain Crunch."""

result = agent.invoke(
    {"messages": [{"role": "user", "content": recorded_conversation}]}
)

result["structured_response"]

```
{'name': 'John Doe', 'email': 'john@example.com', 'phone': '555-123-4567'}
```

Multiple data types are supported
- pydantic BaseModel
- TypedDict
- dataclasses
- json schema (dict)

from langchain.agents import create_agent
from pydantic import BaseModel


class ContactInfo(BaseModel):
    name: str
    email: str
    phone: str


agent = create_agent(model="openai:gpt-5-mini", response_format=ContactInfo)

recorded_conversation = """ We talked with John Doe. He works over at Example. His number is, let's see, 
five, five, five, one two three, four, five, six seven. Did you get that?
And, his email was john at example.com. He wanted to order 50 boxes of Captain Crunch."""

result = agent.invoke(
    {"messages": [{"role": "user", "content": recorded_conversation}]}
)

result["structured_response"]

```
ContactInfo(name='John Doe', email='john@example.com', phone='555-123-4567')
```
This part of lesson is we can format the input the way we want using Structured class
-------------------------------------------------------------------------------------------------------------------
Lesson 8

Dynamic Prompt

from dataclasses import dataclass


@dataclass
class RuntimeContext:
    is_employee: bool
    db: SQLDatabase

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

SYSTEM_PROMPT_TEMPLATE = """You are a careful SQLite analyst.

Rules:
- Think step-by-step.
- When you need data, call the tool `execute_sql` with ONE SELECT query.
- Read-only only; no INSERT/UPDATE/DELETE/ALTER/DROP/CREATE/REPLACE/TRUNCATE.
- Limit to 5 rows unless the user explicitly asks otherwise.
{table_limits}
- If the tool returns 'Error:', revise the SQL and try again.
- Prefer explicit column lists; avoid SELECT *.
"""

Build a Dynamic Prompt (Utilize runtime context and middleware to generate a dynamic prompt.)

from langchain.agents.middleware.types import ModelRequest, dynamic_prompt


@dynamic_prompt
def dynamic_system_prompt(request: ModelRequest) -> str:
    if not request.runtime.context.is_employee:
        table_limits = "- Limit access to these tables: Album, Artist, Genre, Playlist, PlaylistTrack, Track."
    else:
        table_limits = ""

    return SYSTEM_PROMPT_TEMPLATE.format(table_limits=table_limits)

Include middleware in `create_agent`.


from langchain.agents import create_agent

agent = create_agent(
    model="openai:gpt-5",
    tools=[execute_sql],
    middleware=[dynamic_system_prompt],
    context_schema=RuntimeContext,
)

question = "What is the most costly purchase by Frank Harris?"

for step in agent.stream(
    {"messages": [{"role": "user", "content": question}]},
    context=RuntimeContext(is_employee=False, db=db),
    stream_mode="values",
):
    step["messages"][-1].pretty_print()


```
================================ Human Message =================================

What is the most costly purchase by Frank Harris?
================================== Ai Message ==================================

I can’t determine purchases with the tables I’m allowed to query. To find Frank Harris’s most costly purchase, I need access to the sales tables (Customer, Invoice, and InvoiceLine).

Please grant access to those tables (or share the relevant records). If you confirm, I’ll compute either:
- The highest-value invoice for Frank Harris, or
- The single most expensive item he bought (highest UnitPrice on his invoice lines),

whichever you mean by “most costly purchase.”
```

question = "What is the most costly purchase by Frank Harris?"

for step in agent.stream(
    {"messages": [{"role": "user", "content": question}]},
    context=RuntimeContext(is_employee=True, db=db),
    stream_mode="values",
):
    step["messages"][-1].pretty_print()

```
================================ Human Message =================================

What is the most costly purchase by Frank Harris?
================================== Ai Message ==================================
Tool Calls:
  execute_sql (call_ZinqhHDYK9NObnRbnFk4DiY4)
 Call ID: call_ZinqhHDYK9NObnRbnFk4DiY4
  Args:
    query: SELECT name FROM sqlite_master WHERE type = 'table' ORDER BY name LIMIT 5;
================================= Tool Message =================================
Name: execute_sql

[('Album',), ('Artist',), ('Customer',), ('Employee',), ('Genre',)]
================================== Ai Message ==================================
Tool Calls:
  execute_sql (call_yOJjO05SJ5HMndcr3dtNQltF)
 Call ID: call_yOJjO05SJ5HMndcr3dtNQltF
  Args:
    query: SELECT i.InvoiceId, i.InvoiceDate, i.Total
FROM Invoice i
JOIN Customer c ON i.CustomerId = c.CustomerId
WHERE c.FirstName = 'Frank' AND c.LastName = 'Harris'
ORDER BY i.Total DESC
LIMIT 1;
================================= Tool Message =================================
Name: execute_sql

[(145, '2010-09-23 00:00:00', 13.86)]
================================== Ai Message ==================================

Frank Harris’s most costly purchase was $13.86 (Invoice 145 on 2010-09-23).
```

This part of lesson is we can use runtime context and middleware to generate a dynamic prompt.
-------------------------------------------------------------------------------------------------------------------
Lesson 9


from langchain.agents import create_agent
from langchain.agents.middleware import HumanInTheLoopMiddleware
from langgraph.checkpoint.memory import InMemorySaver

agent = create_agent(
    model="openai:gpt-5",
    tools=[execute_sql],
    system_prompt=SYSTEM_PROMPT,
    checkpointer=InMemorySaver(),
    context_schema=RuntimeContext,
    middleware=[
        HumanInTheLoopMiddleware(
            interrupt_on={"execute_sql": {"allowed_decisions": ["approve", "reject"]}},
        ),
    ],
)

from langgraph.types import Command

question = "What are the names of all the employees?"

config = {"configurable": {"thread_id": "1"}}

result = agent.invoke(
    {"messages": [{"role": "user", "content": question}]},
    config=config,
    context=RuntimeContext(db=db)
)

if "__interrupt__" in result:
    description = result['__interrupt__'][-1].value['action_requests'][-1]['description']
    print(f"\033[1;3;31m{80 * '-'}\033[0m")
    print(
        f"\033[1;3;31m Interrupt:{description}\033[0m"
    )

    result = agent.invoke(
        Command(
            resume={
                "decisions": [{"type": "reject", "message": "the database is offline."}]
            }
        ),
        config=config,  # Same thread ID to resume the paused conversation
        context=RuntimeContext(db=db),
    )
    print(f"\033[1;3;31m{80 * '-'}\033[0m")

print(result["messages"][-1].content)

```
--------------------------------------------------------------------------------
 Interrupt:Tool execution requires approval

Tool: execute_sql
Args: {'query': "SELECT name FROM sqlite_master WHERE type = 'table' AND lower(name) LIKE '%employee%' LIMIT 5;"}
--------------------------------------------------------------------------------
The database is currently offline. Please try again later.
```

config = {"configurable": {"thread_id": "2"}}

result = agent.invoke(
    {"messages": [{"role": "user", "content": question}]},
    config=config,
    context=RuntimeContext(db=db)
)

while "__interrupt__" in result:
    description = result['__interrupt__'][-1].value['action_requests'][-1]['description']
    print(f"\033[1;3;31m{80 * '-'}\033[0m")
    print(
        f"\033[1;3;31m Interrupt:{description}\033[0m"
    )
    
    result = agent.invoke(
        Command(
            resume={"decisions": [{"type": "approve"}]}
        ),
        config=config,  # Same thread ID to resume the paused conversation
        context=RuntimeContext(db=db),
    )

for msg in result["messages"]:
    msg.pretty_print()

```
--------------------------------------------------------------------------------
 Interrupt:Tool execution requires approval

Tool: execute_sql
Args: {'query': "SELECT name FROM sqlite_master WHERE type='table' ORDER BY name LIMIT 50;"}
--------------------------------------------------------------------------------
 Interrupt:Tool execution requires approval

Tool: execute_sql
Args: {'query': "SELECT FirstName || ' ' || LastName AS FullName FROM Employee ORDER BY LastName, FirstName;"}
================================ Human Message =================================

What are the names of all the employees?
================================== Ai Message ==================================
Tool Calls:
  execute_sql (call_jqiRG1UfS4btHYeOEL2SwHvJ)
 Call ID: call_jqiRG1UfS4btHYeOEL2SwHvJ
  Args:
    query: SELECT name FROM sqlite_master WHERE type='table' ORDER BY name LIMIT 50;
================================= Tool Message =================================
Name: execute_sql

[('Album',), ('Artist',), ('Customer',), ('Employee',), ('Genre',), ('Invoice',), ('InvoiceLine',), ('MediaType',), ('Playlist',), ('PlaylistTrack',), ('Track',)]
================================== Ai Message ==================================
Tool Calls:
  execute_sql (call_yZFckESdLKxfOeKjIJRT74we)
 Call ID: call_yZFckESdLKxfOeKjIJRT74we
  Args:
    query: SELECT FirstName || ' ' || LastName AS FullName FROM Employee ORDER BY LastName, FirstName;
================================= Tool Message =================================
Name: execute_sql

[('Andrew Adams',), ('Laura Callahan',), ('Nancy Edwards',), ('Steve Johnson',), ('Robert King',), ('Michael Mitchell',), ('Margaret Park',), ('Jane Peacock',)]
================================== Ai Message ==================================

Here are the employee names (LastName, FirstName order):

- Andrew Adams
- Laura Callahan
- Nancy Edwards
- Steve Johnson
- Robert King
- Michael Mitchell
- Margaret Park
- Jane Peacock
```

This part of lesson is we can interrupt the agent, requiring approval or rejection from user to keep going or not

Here is what you should do, learn the basic above, and apply the following accordingly
- Apply short-term memory architecture to my chatbox, so that helps the agent understand the whole context of conversation.
- Other than that, just apply what it's nessary to my app to make it better in handling user input and provide services users expected