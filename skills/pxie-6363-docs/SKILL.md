---
name: pxie-6363-docs
description: Documentation for NI PXIe-6363 module card hardware & NI-DAQmx C/C++ API. Load this skill ONLY if you're working with PXIe-6363 hardware/API. DO NOT load this if you're working with other NI hardware.
---

# NI PXIe-6363 module card with SCB-68A breakout board

## Agent rules

- Discover the DAQmx device name at runtime; do not assume `Dev1`.
- Do not confuse physical Connector 0/1 with DAQmx `port0`/`port1`/`port2`.
- Check DAQmx calls with `check_daqmx(...)`.
- Use `DaqmxTask` so tasks are cleared on normal scope exit and exceptions.
- Use known safe output values and restore outputs to a safe state before releasing a task.
- Successful DAQmx calls verify API access, not connector-level electrical behavior.

## Hardware overview

One PXIe-6363 provides:

- 32 single-ended or 16 differential analog inputs
- 4 analog outputs
- 48 bidirectional digital I/O lines — the same 48 physical digital lines can be configured as either input or output, not 48 DI plus 48 DO
  - 32 Port 0 lines supporting static and hardware-timed I/O
  - 16 PFI/Port 1/Port 2 lines supporting static I/O
- Two 68-pin VHDCI connectors, named Connector 0 and Connector 1

Up to two SCB-68A shielded terminal blocks can be connected to one PXIe-6363: one per connector using an appropriate cable such as the SHC68-68-EPM.

The SCB-68A is a passive screw-terminal breakout. It does not add channels or duplicate the card's I/O.

## Connector distribution

| Card connector | Principal signals |
|---|---|
| Connector 0 | AI 0-15, AO 0-1, P0.0-7, P1.0-7/PFI 0-7 |
| Connector 1 | AI 16-31, AO 2-3, P0.8-31, P2.0-7/PFI 8-15 |

Ground, power, sensing, timing, and other terminal assignments are omitted here. Consult the official pinout before wiring.

## NI-DAQmx C API from C++

Include the NI-DAQmx C header:

```cpp
#include <NIDAQmx.h>
```

The examples below are intentionally minimal and demonstrate basic DAQmx usage rather than complete application architecture.

### Error handling

DAQmx functions return `int32`. Negative values are errors; `DAQmxFailed(status)` tests for them. `check_daqmx()` below throws `std::runtime_error` on errors.

```cpp
#include <stdexcept>
#include <string>

void check_daqmx(int32 status)
{
    if (!DAQmxFailed(status)) return;

    char message[2048]{};
    DAQmxGetExtendedErrorInfo(message, sizeof(message));

    throw std::runtime_error(
        "NI-DAQmx error " + std::to_string(status) + ": " + message);
}
```

Call `DAQmxGetExtendedErrorInfo()` immediately after a failed DAQmx call, before making other DAQmx calls that could replace the extended error information.

### Task lifetime

Use RAII so a successfully created task is cleared during normal scope exit or exception unwinding.

```cpp
class DaqmxTask
{
  public:
    // Throws std::runtime_error if task creation fails.
    DaqmxTask() {
        check_daqmx(DAQmxCreateTask("", &m_handle));
    }

    // Clears the task during normal scope exit or stack unwinding.
    ~DaqmxTask() noexcept {
        if (m_handle != nullptr) DAQmxClearTask(m_handle);
    }

    DaqmxTask(const DaqmxTask&) = delete;
    DaqmxTask& operator=(const DaqmxTask&) = delete;

    TaskHandle get() const noexcept {
        return m_handle;
    }

  private:
    TaskHandle m_handle = nullptr;
};
```

## Device discovery

DAQmx device names such as `Dev1` are assigned at runtime. Do not assume a particular name.

String-returning queries generally use two calls: first with `nullptr, 0` to obtain the required buffer size, then with an allocated buffer.

```cpp
#include <vector>

int32 size = DAQmxGetSysDevNames(nullptr, 0);
check_daqmx(size);

std::vector<char> names(size > 0 ? size : 1);

check_daqmx(
    DAQmxGetSysDevNames(
        names.data(),
        static_cast<uInt32>(names.size())));

// `names` contains a comma-separated list such as "Dev1,Dev2".
```

Useful device queries include:

```cpp
DAQmxGetSysDevNames(...)
DAQmxGetDevProductType(...)
DAQmxGetDevIsSimulated(...)

DAQmxGetDevAIPhysicalChans(...)
DAQmxGetDevAOPhysicalChans(...)
DAQmxGetDevDILines(...)
DAQmxGetDevDOLines(...)
DAQmxGetDevDIPorts(...)
DAQmxGetDevDOPorts(...)
```

Use `DAQmxGetDevProductType(...)` when identifying the desired PXIe-6363 from discovered devices.

Physical channel names include the discovered device name:

```text
Dev1/ai0
Dev1/ao0
Dev1/port0
Dev1/port0/line3
```

## Analog input

```cpp
const std::string channel = device_name + "/ai0";

DaqmxTask task;

check_daqmx(DAQmxCreateAIVoltageChan(
    task.get(),
    channel.c_str(),
    "",
    DAQmx_Val_RSE,
    -10.0,
    10.0,
    DAQmx_Val_Volts,
    nullptr));

check_daqmx(DAQmxStartTask(task.get()));

float64 sample = 0.0;
int32 samples_read = 0;

check_daqmx(DAQmxReadAnalogF64(
    task.get(),
    1,
    10.0,
    DAQmx_Val_GroupByChannel,
    &sample,
    1,
    &samples_read,
    nullptr));

check_daqmx(DAQmxStopTask(task.get()));
```

Use `DAQmx_Val_Diff` instead of `DAQmx_Val_RSE` when channels are correctly wired for differential measurement.

## Analog output

```cpp
const std::string channel = device_name + "/ao0";

DaqmxTask task;

check_daqmx(DAQmxCreateAOVoltageChan(
    task.get(),
    channel.c_str(),
    "",
    -10.0,
    10.0,
    DAQmx_Val_Volts,
    nullptr));

const float64 output_voltage = 0.0;
int32 samples_written = 0;

check_daqmx(DAQmxWriteAnalogF64(
    task.get(),
    1,
    true,
    10.0,
    DAQmx_Val_GroupByChannel,
    &output_voltage,
    &samples_written,
    nullptr));
```

## Digital I/O

| DAQmx port | Width | Hardware-timed I/O |
|---|---:|---|
| `port0` | 32 lines | Yes |
| `port1` | 8 lines | No |
| `port2` | 8 lines | No |

`DAQmx_Val_ChanForAllLines` groups an entire port into one logical channel. Use `DAQmx_Val_ChanPerLine` when each selected physical line must be represented as a separate DAQmx channel.

### Static digital output

```cpp
const std::string port = device_name + "/port0";

DaqmxTask task;

check_daqmx(DAQmxCreateDOChan(
    task.get(),
    port.c_str(),
    "",
    DAQmx_Val_ChanForAllLines));

check_daqmx(
    DAQmxWriteDigitalScalarU32(
        task.get(),
        true,
        10.0,
        0x00000000,
        nullptr));
```

Use a known safe output value and restore outputs to their safe state before releasing the task.

### Static digital input

```cpp
const std::string port = device_name + "/port1";

DaqmxTask task;

check_daqmx(DAQmxCreateDIChan(
    task.get(),
    port.c_str(),
    "",
    DAQmx_Val_ChanForAllLines));

uInt32 value = 0;

check_daqmx(
    DAQmxReadDigitalScalarU32(
        task.get(),
        10.0,
        &value,
        nullptr));

// Port 1 has eight lines.
value &= 0xFF;
```

### Buffered and hardware-timed I/O

Relevant APIs include:

```cpp
DAQmxCfgSampClkTiming(...)

DAQmxReadDigitalU32(...)
DAQmxWriteDigitalU32(...)

DAQmxReadDigitalLines(...)
DAQmxWriteDigitalLines(...)
```

## Official references

- PXIe-6363 specifications:  
  https://www.ni.com/docs/en-US/bundle/pxie-6363-specs/page/specs.html
- X Series user manual and PXIe-6363 pinout:  
  https://www.ni.com/docs/en-US/bundle/pcie-pxie-usb-63xx-features/resource/370784k.pdf
- SCB-68A documentation:  
  https://www.ni.com/en/shop/hardware/connectors/model-scb-68a
- Cable and accessory compatibility:  
  https://www.ni.com/en/support/documentation/cable-accessory-guide/daq-multifunction-i-o-cable-accessory-compatibility/main-page---daq-multifunction-i-o-cable-and-accessory-compatibil/63xx-models.html
