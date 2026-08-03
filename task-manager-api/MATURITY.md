# Richardson Maturity Model Evaluation: Task Management REST API

## Executive Summary

This document evaluates the **Task Management REST API** built in Practical 4 against the **Richardson Maturity Model (RMM)**. 

The evaluation concludes that the Task Management API currently achieves **Level 2 (HTTP Verbs & Status Codes)** of the Richardson Maturity Model, while demonstrating **Level 3 (HATEOAS) Awareness**.

---

## Richardson Maturity Model Evaluation Table

| Level | Criterion | Does your API satisfy this? | Evidence |
| :--- | :--- | :---: | :--- |
| **Level 0** | **The Swamp of POX** (Single URI, single HTTP method e.g. POST, plain XML/JSONRPC format) | **Yes (Surpassed)** | The API initially uses HTTP transport but moves beyond single-endpoint POX design by exposing distinct resource endpoints. |
| **Level 1** | **Resources** (Multiple URIs, individual resource addressing instead of a monolithic endpoint) | **Yes** | Uses URI path hierarchy for distinct resources: `/tasks` for the collection and `/tasks/:id` for individual items. |
| **Level 2** | **HTTP Verbs & Status Codes** (Correct HTTP methods: GET, POST, PUT, DELETE; meaningful HTTP status codes: 200, 201, 400, 404, 415, 500) | **Yes** | Implements `GET`, `POST`, `PUT`, `DELETE` correctly according to RFC semantics, with proper status codes (`200 OK`, `201 Created`, `400 Bad Request`, `404 Not Found`, `415 Unsupported Media Type`). |
| **Level 3** | **Hypermedia Controls (HATEOAS)** (Responses include navigation links/actions dynamically driving client workflow) | **Awareness Only** | Core API response payloads return plain JSON data. Level 3 format is documented below as hypermedia design awareness. |

---

## Endpoint-by-Endpoint RMM Level 2 Audit

| HTTP Method | Endpoint | Purpose | Status Codes Returned | Level 2 Compliance |
| :--- | :--- | :--- | :--- | :---: |
| `GET` | `/tasks` | Retrieve all tasks | `200 OK`, `500 Internal Server Error` | Compliant |
| `GET` | `/tasks/:id` | Retrieve single task by ID | `200 OK`, `400 Bad Request`, `404 Not Found`, `500` | Compliant |
| `POST` | `/tasks` | Create a new task | `201 Created`, `400 Bad Request`, `415 Unsupported Media Type`, `500` | Compliant |
| `PUT` | `/tasks/:id` | Update task title and/or completed status | `200 OK`, `400 Bad Request`, `404 Not Found`, `415 Unsupported Media Type`, `500` | Compliant |
| `DELETE` | `/tasks/:id` | Remove task by ID | `200 OK`, `400 Bad Request`, `404 Not Found`, `500` | Compliant |

---

## Level 3: HATEOAS (Hypermedia As The Engine Of Application State) Awareness

If extending this API to satisfy **Level 3**, response payloads would include a `_links` object (following HAL or JSON-LD standards) providing state transitions and actions the client can perform next:

```json
{
  "id": 1,
  "title": "Build RESTful APIs",
  "completed": false,
  "_links": {
    "self": {
      "href": "/tasks/1",
      "method": "GET",
      "description": "Fetch current task details"
    },
    "update": {
      "href": "/tasks/1",
      "method": "PUT",
      "description": "Update task title or completion status"
    },
    "delete": {
      "href": "/tasks/1",
      "method": "DELETE",
      "description": "Delete this task"
    },
    "collection": {
      "href": "/tasks",
      "method": "GET",
      "description": "Navigate back to all tasks"
    }
  }
}
```

---

## Why Most Production APIs Stop at Level 2

While Level 3 (HATEOAS) provides self-describing APIs and decouples clients from fixed URL structures, the vast majority of real-world production APIs (e.g., Stripe, GitHub, Twilio) deliberately stop at **Level 2**. 

The main reasons include:

1. **Overhead and Payload Size**: Adding hypermedia metadata (`_links`) to every response object increases network payload size and bandwidth, especially for large arrays of data.
2. **Client Complexity**: Front-end applications (React, Angular, Mobile apps) and API SDKs usually build static API clients mapped directly to known routes. Dynamically parsing hypermedia links in client code introduces unnecessary abstraction and engineering overhead.
3. **Sufficient Standardization at Level 2**: Level 2 combined with OpenAPI/Swagger specifications, TypeScript definitions, and robust documentation gives developers all the predictability, type safety, and tooling they need without the runtime complexity of HATEOAS.

---

## Conclusion

The **Task Management REST API** fully satisfies **Richardson Maturity Model Level 2** by enforcing:
- Resource-oriented URLs (`/tasks`, `/tasks/:id`).
- Standard HTTP methods (`GET`, `POST`, `PUT`, `DELETE`).
- Explicit, meaningful HTTP status codes (`200`, `201`, `400`, `404`, `415`, `500`).
- Strict JSON content-type validation and error handling.
