---
name: doctest-cmake
description: Set up and write doctest tests in CMake C++ projects. Load this skill ONLY when setting up doctest in a project, adding new tests, or modifying test CMake configuration. DO NOT load this when merely editing existing test files.
---

This skill guides setup and usage of the doctest single-header testing framework in CMake projects, using a hybrid pattern: dedicated test files in `tests/` for most tests, with rare colocated tests at the bottom of source `.cpp` files for small self-contained utilities.

## Setup Instructions

### 1. Verify doctest header exists

Ensure the doctest header is vendored at `third-party/include/doctest/doctest.h`. If missing, download the latest tag's header from `https://raw.githubusercontent.com/doctest/doctest/<TAG>/doctest/doctest.h`, where `<TAG>` is the latest tag listed on https://github.com/doctest/doctest/releases.

### 2. Create test runner entry point

Create `tests/test_main.cpp`:

```cpp
#define DOCTEST_CONFIG_IMPLEMENT_WITH_MAIN
#include "doctest/doctest.h"
```

### 3. Set up top-level CMake test-library pattern

In the top-level `CMakeLists.txt`, production and test targets are gated by `BUILD_TESTS` and `ONLY_BUILD_TESTS` options:

```cmake
file(GLOB_RECURSE MY_PROJECT_SOURCES CONFIGURE_DEPENDS
     "${CMAKE_CURRENT_SOURCE_DIR}/src/*.cpp")
list(REMOVE_ITEM MY_PROJECT_SOURCES "${CMAKE_CURRENT_SOURCE_DIR}/src/main.cpp")

option(BUILD_TESTS "Build test executables" OFF)
option(ONLY_BUILD_TESTS "Only build tests, skip other executables" OFF)
if(ONLY_BUILD_TESTS)
    set(BUILD_TESTS ON CACHE BOOL "Build test executables" FORCE)
endif()

if(NOT ONLY_BUILD_TESTS)
    add_library(my_project ${MY_PROJECT_SOURCES})  # replace my_project with project name
    target_compile_definitions(my_project PUBLIC DOCTEST_CONFIG_DISABLE)
    add_executable(${PROJECT_NAME} src/main.cpp)  # main() lives in its own file
    target_link_libraries(${PROJECT_NAME} PRIVATE my_project)
    # ... production examples ...
endif()

if(BUILD_TESTS)
    add_library(my_project_tests OBJECT ${MY_PROJECT_SOURCES})
    # ... same dependencies as my_project, but no DOCTEST_CONFIG_DISABLE ...
    add_subdirectory(tests)
endif()
```

Key points:
- Exclude `src/main.cpp` from the source list to avoid duplicate `main()` (`test_main.cpp` provides it for the test binary)
- `DOCTEST_CONFIG_DISABLE` on the production target strips all test code at compile time — no preprocessor guards needed
- `ONLY_BUILD_TESTS=ON` implies `BUILD_TESTS=ON` and skips the production target
- Use `OBJECT` library type for the test target so colocated tests are always compiled and linked into the test binary

### 4. Configure tests/CMakeLists.txt with auto-discovery

```cmake
file(GLOB_RECURSE TEST_SOURCES CONFIGURE_DEPENDS
     "${CMAKE_CURRENT_SOURCE_DIR}/*.cpp")

list(REMOVE_ITEM TEST_SOURCES "${CMAKE_CURRENT_SOURCE_DIR}/test_main.cpp")

add_executable(tests ${TEST_SOURCES} test_main.cpp)
target_link_libraries(tests PRIVATE my_project_tests)
set_target_properties(tests PROPERTIES RUNTIME_OUTPUT_DIRECTORY
                                       ${CMAKE_BINARY_DIR}/tests)
```

This auto-discovers all `tests/*.cpp` files, excludes `test_main.cpp` from the glob (then adds it back explicitly), and links against `my_project_tests`.

Note: `CONFIGURE_DEPENDS` re-globs at build time, but some generators may need a `cmake -B build` re-run before a newly added file is picked up.

KEEP exactly one first-party doctest executable. ADD all test sources, including conditional or platform-specific tests, to the existing `tests` target. DO NOT create dedicated test runners.

## Writing Tests

### Dedicated test files (preferred)

Most tests go in `tests/test_<ComponentOrFunctionName>.cpp`. New test files in `tests/` are auto-discovered by `GLOB_RECURSE` — no CMake edits required for routine additions.

```cpp
#include "doctest/doctest.h"
#include "math/vec3.h"

TEST_CASE("Vec3 normalize produces unit length") {
    // ...
}
```

### Colocated tests (for small self-contained utilities only)

Rarely, a small utility test may appear at the bottom of a source `.cpp` file:

```cpp
// src/utils/some_util.cpp

#include "utils/some_util.h"

// ... implementation ...

// Colocated test — automatically disabled in production via DOCTEST_CONFIG_DISABLE
#include "doctest/doctest.h"

TEST_CASE("some_util behaves correctly") {
    CHECK(some_util(0) == 0);
}
```

Do not colocate tests for complex components — put those in dedicated `tests/` files.

### Test naming

Use `TEST_CASE` with descriptive English phrases:

```cpp
TEST_CASE("RingBuffer evicts oldest element when full")
```

Use `TEST_CASE_FIXTURE` with simple fixture structs for shared setup:

```cpp
struct ConfigFixture {
    ConfigFixture() { /* set up config */ }
    Config config;
};

TEST_CASE_FIXTURE(ConfigFixture, "config loads valid defaults") {
    REQUIRE_MESSAGE(config.is_valid(), "config should have valid defaults");
}
```

### Assertions

- Prefer `REQUIRE_MESSAGE` / `CHECK_MESSAGE` where diagnostics help understanding
- Use `doctest::Approx` for floating-point comparisons

## Building and Running

```bash
cmake -B build -DBUILD_TESTS=ON
cmake --build build

./build/tests/tests           # Run all tests
```

To build only tests (skip main application and examples):

```bash
cmake -B build -DONLY_BUILD_TESTS=ON
cmake --build build
```

The `RUNTIME_OUTPUT_DIRECTORY` property places the test executable at `<build-dir>/tests/tests`.
