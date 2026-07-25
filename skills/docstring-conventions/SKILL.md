---
name: docstring-conventions
description: Code docstring conventions. Load this skill ONLY after code editing is complete, when writing docstrings. DO NOT load this while planning or editing code.
---

# Use `/** */` comment style with ending full-stop

Do not use `@brief`; the first line of the docstring is the summary.

```cpp
/** Represents a target. */
struct Target {
    int id;
};

/** Compute the factorial recursively. */
int factorial(int n);
```

# Prefer single-line docstrings

Use the multi-line form only when the detail does not fit on one line.

```cpp
// Bad
/**
 * Compute the factorial recursively.
 */
int factorial(int n);

// Good
/** Compute the factorial recursively. */
int factorial(int n);

/**
 * Clamp a bounding box to image bounds. Scales width/height down if the box exceeds the
 * image dimensions, and shifts it inward if it crosses an edge.
 */
cv::Rect clamp_bbox(const cv::Rect& box, const cv::Size& image_size);
```

# Write summaries in imperative mood; never restate the signature

Use imperative mood for functions (`Compute the IoU ...`). Use a noun phrase or present-tense description for types (`Represents a target.`).

Omit the docstring when the signature is self-explanatory.

```cpp
// Bad
/** Set verbose mode. */
void set_verbose(bool verbose);

/** Getter for size. */
int size() const;

// Good
void set_verbose(bool verbose);

/** Return the number of tracked targets. */
int size() const;
```

# Use `@param`/`@return` only when they add information

Use the elaborate multi-line form when parameters or the return value carry non-obvious semantics — units, valid ranges, ownership, edge-case behavior. `@param`/`@return` descriptions have no ending full-stop.

```cpp
// Bad
/**
 * Load an item.
 *
 * @param id The id of the item
 * @return The loaded item
 */
Item load(int id);

// Good
/**
 * Compute IoU between two axis-aligned bounding boxes.
 *
 * Returns 0.0 for non-overlapping boxes; both boxes are assumed to use the OpenCV
 * (x, y, width, height) convention with non-negative width/height.
 *
 * @param a First bounding box
 * @param b Second bounding box
 *
 * @return Intersection-over-union in [0.0, 1.0], or 0.0 if boxes do not overlap
 */
double iou(const cv::Rect& a, const cv::Rect& b);
```

Omit the tags when parameter names and types are self-explanatory and the return value is obvious from the summary; prefer a single-line docstring instead.

# Start `.h` files with a one-line file docstring

Place it at the very top of the file, before `#pragma once`.

```cpp
/** Defines the algorithm for clustering targets between IPUs. */
#pragma once

#include <map>
#include <vector>
```

# Document fields with trailing `//` comments

Use trailing `//` comments for struct/class fields, not docstrings.

```cpp
struct Config {
    int thread_count = 1;  // Must be positive
    bool verbose = false;  // Include per-task diagnostics
};
```

# Document public API in `.h`; document `static` helpers in `.cpp`

Put the docstring in the header for public API. For `static` helpers that exist only in a `.cpp`, put the docstring above the definition.

```cpp
// foo.h
/** Declares the public API of the foo module. */
#pragma once

/** Do the thing with x. */
void do_thing(int x);
```

```cpp
// foo.cpp
#include "foo.h"

void do_thing(int x) {
    // ...
}

/** Internal helper: documented in the .cpp since it has no header declaration. */
static int helper(int n) {
    // ...
}
```

# Omit docstrings on overrides that copy the interface docstring

If an override's docstring would just repeat the interface method's docstring, omit it. Add a docstring only where the override's behavior differs.

```cpp
class IWorker {
public:
    virtual ~IWorker() = default;

    /** Run the worker until completion. */
    virtual void run() = 0;
};

class Worker : public IWorker {
public:
    virtual void run() override;
};
```
