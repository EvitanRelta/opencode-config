---
name: code-conventions
description: C++ code conventions. Load this skill ONLY when you're about to edit C++ code. DO NOT load this while planning or when not immediately editing C++ files.
---

# Naming conventions

- Types & Templates (`CamelCase`): Classes, structs, enums, type aliases, template parameters. (e.g. `using NodeList = ...;`, `template <typename KeyType>`)
- Constants (`UPPER_CASE`): `constexpr`, static/global `const`, enum values.
- General (`lower_case`): Namespaces, functions, parameters, local variables (including local `const`), public members. (e.g. `struct Point { int x_pos; };`)
- Private Members (`m_lower_case`): Private member variables.

# No braces for single-line statements

Applies to `if`, `for`, `while`, etc., including single-statement `for` loops.

```cpp
// Bad
if (error) {
    return false;
}
for (...) {
    do_work();
}

// Good
if (error) return false;
for (...) do_work();
```

# Prefer guard-clause style if statements

Early-return on the error/negative case, then handle the success path.

```cpp
// Bad
auto it = num_store.find(key);
if (it != num_store.end()) {
    out_value = static_cast<T>(it->second);
    return true;
}
return false;

// Good
auto it = num_store.find(key);
if (it == num_store.end()) return false;

out_value = static_cast<T>(it->second);
return true;
```

# Use init statements in if conditions

Use an `if` initializer when the initialized value is only needed by the condition and its branches. This limits the value's scope.

```cpp
// Bad
auto it = m_targets.find(key);
if (it != m_targets.end()) {
    // ...
}

auto result = calculate_value();
if (result > threshold) {
    // ...
}

// Good
if (auto it = m_targets.find(key); it != m_targets.end()) {
    // ...
}

if (auto result = calculate_value(); result > threshold) {
    // ...
}
```

# Use structured bindings for pair/tuple access

```cpp
// Bad
if (auto it = m_cache.find(key); it != m_cache.end()) {
    const Key& found_key = it->first;
    const Value& found_value = it->second;
    // ...
}

auto result = get_value();
int status = result.first;
std::string data = result.second;

// Good
if (auto it = m_cache.find(key); it != m_cache.end()) {
    const auto& [found_key, found_value] = *it;
    // ...
}

auto [status, data] = get_value();
```

# Choose `struct` or `class` by responsibility

Use `struct` for public data aggregates. Use `class` when the type encapsulates state, manages resources, or maintains invariants.

```cpp
struct Point {
    int x = 0;
    int y = 0;

    bool is_origin() const { return x == 0 && y == 0; }
};

class Connection {
public:
    bool connect();

private:
    bool m_connected = false;
};
```

Simple helper methods do not prevent a data aggregate from being a `struct`. For example, `Point::is_origin()` above is a simple helper method.

# Use interface and override conventions

Prefix abstract interface names with `I`. Give interfaces a defaulted virtual destructor and declare required operations as pure virtual.

In derived classes, use both `virtual` and `override`.

```cpp
class IWorker {
public:
    virtual ~IWorker() = default;

    virtual void run() = 0;
};

class Worker : public IWorker {
public:
    virtual ~Worker() override = default;

    virtual void run() override;
};
```

Use `final` only when an override is intentionally closed to further customization.

# Prefer `Config` for configuration structs

When its scope makes the purpose clear, prefer the name `Config` rather than repeating the owning type's name. Usually nest it inside the type it configures.

Give fields sensible defaults. Comment fields when their units, constraints, or behavior are not obvious from the name.

```cpp
class Worker {
public:
    struct Config {
        int thread_count = 1;  // Must be positive
        bool verbose = false;  // Include per-task diagnostics
    };

    explicit Worker(const Config& config);
};
```

Use a more specific name only when `Config` would be ambiguous in its scope.

# Prefer default member initializers

Initialize default state at the member declaration when it does not depend on constructor arguments. Reserve constructor initializer lists for values derived from constructor inputs.

```cpp
class Counter {
public:
    explicit Counter(int limit) : m_limit(limit) {}

private:
    int m_limit;
    int m_value = 0;
    bool m_enabled = true;
};
```

This keeps each member's default in one place and avoids repeating it across constructors.

# Use scoped enums

Prefer `enum class` over unscoped enums. Use `std::uint8_t` as the underlying type for small fixed sets when appropriate.

Nest an enum inside a type when it is specific to that type. Keep it at namespace scope when it is shared by multiple types.

```cpp
class Worker {
public:
    enum class State : std::uint8_t {
        IDLE,
        RUNNING,
        STOPPED,
    };
};
```

# Input/output parameters and const-correctness

Pass non-trivial read-only inputs by `const T&`.

Prefer returning a single result by value. Use an `out_` parameter when a function also returns status, produces multiple outputs, or must write into caller-owned storage.

Use a non-const reference with an `out_` name for pure output parameters. Do not use the `out_` prefix for values that are both read and modified.

Mark getters and other non-mutating methods `const`.

```cpp
void process(const Data& input);

Data load();

bool read(Data& out_data);

void normalize(Data& data);

int size() const;
```

# Keep includes together

Avoid empty lines between `#include` directives. Keep all includes in one contiguous block.

# Prefer named C++ casts

Use `static_cast<T>(value)` for explicit numeric, enum, and other well-defined conversions. Do not use C-style casts.

```cpp
// Bad
double ratio = (double)count / total;

// Good
double ratio = static_cast<double>(count) / total;
```

Use other named casts, such as `reinterpret_cast`, only when their specific low-level semantics are required.

# (C++20) Use designated initializers for public aggregates

Use designated initializers when constructing public aggregate types. Naming each field is clearer than relying on declaration order.

```cpp
struct Point {
    int x;
    int y;
};

Point point{.x = 10, .y = 20};
```

Positional initialization remains acceptable for small private working structs when the field order is obvious.

# Distinguish assertions, exceptions, and recoverable errors

Use assertions for internal invariants and programmer errors. Include a concise message describing the required condition.

```cpp
assert(index < size && "Index must be in range");
```

Assertions must not contain required side effects or validate conditions that can legitimately fail at runtime.

Throw an exception for invalid external input, invalid configuration, or a violated public contract.

```cpp
if (limit < 0)
    throw std::invalid_argument("Limit cannot be negative");
```

Return a status such as `bool` or `std::optional<T>` for expected or recoverable outcomes such as end-of-stream, unavailable data, or an I/O operation that could not be completed.

```cpp
bool read(Item& out_item);

std::optional<Item> find(int id);
```

# Define helper functions below primary implementations, with forward declarations on top

Primary implementations means the public or member functions that form the file's main API.

In `.cpp` files, forward-declare helper functions immediately below the `#include` / `using` lines. Precede them with this comment exactly:

```cpp
// Forward declarations of helper functions
```

Define the helpers below all primary implementations, under this header exactly:

```cpp
//==============================================================================
// HELPER FUNCTIONS
//==============================================================================
```

Example layout:

```cpp
#include "my_module.h"

// Forward declarations of helper functions
static int clamp_to_range(int v, int lo, int hi);
static int normalize(int v);

int my_module::process(int input) {
    return normalize(input);
}

//==============================================================================
// HELPER FUNCTIONS
//==============================================================================
static int clamp_to_range(int v, int lo, int hi) {
    if (v < lo) return lo;
    if (v > hi) return hi;
    return v;
}

static int normalize(int v) {
    return clamp_to_range(v, 0, 255);
}
```

# Use `#pragma once` in headers

Use `#pragma once` instead of traditional macro include guards.

```cpp
#pragma once

#include "myfile.h"
```

# Prefer `static` over anonymous namespaces (for functions and variables)

In `.cpp` files, use `static` for file-scope functions and variables instead of an anonymous `namespace { ... }`.

```cpp
// Bad
namespace {
int counter = 0;
int helper() { /* ... */ }
}

// Good
static int counter = 0;
static int helper() { /* ... */ }
```

Anonymous namespaces remain acceptable for internal types (class/struct/enum), where `static` doesn't apply.
