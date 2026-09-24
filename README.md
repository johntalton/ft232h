# FT232H

[![npm Version](http://img.shields.io/npm/v/@johntalton/ft232h.svg)](https://www.npmjs.com/package/@johntalton/ft232h)
![GitHub package.json version](https://img.shields.io/github/package-json/v/johntalton/ft232h)
[![CI](https://github.com/johntalton/ft232h/actions/workflows/CI.yml/badge.svg)](https://github.com/johntalton/ft232h/actions/workflows/CI.yml)
![GitHub](https://img.shields.io/github/license/johntalton/ft232h)
[![Downloads Per Month](http://img.shields.io/npm/dm/@johntalton/ft232h.svg)](https://www.npmjs.com/package/@johntalton/ft232h)
![GitHub last commit](https://img.shields.io/github/last-commit/johntalton/ft232h)

WebUSB based driver for FT232H chip

Intended to provide I²C abstraction for compatibility with [I2CBus](https://github.com/johntalton/and-other-delights)

## Example

Standard setup

```js
import { FT232H, BIT_MODE } from '@johntalton/ft232h'

const usbDevice = // via navigator.usb.requestDevice

// open usb
await usbDevice.open()

// chip form usb device
const ftDevice = await FT232H.from(usbDevice)

// using MPSSE
await ftDevice.setBitMode(BIT_MODE.MPSSE)
```

Blink LED via GPIO

```js
import { PIN_STATE_COMMANDS } from '@johntalton/ft232h'

// ...
export const delayMs = ms => new Promise(resolve => setTimeout(resolve, ms))

// LED on
await ftDevice.sendData(Uint8Array.from([
  PIN_STATE_COMMANDS.SET_DATA_BITS_HIGH_BYTE,
  0b1000_0000, // gpio to set (HIGH)
  0b1000_0000
]))

await delayMs(500)

// LED off
await ftDevice.sendData(Uint8Array.from([
  PIN_STATE_COMMANDS.SET_DATA_BITS_HIGH_BYTE,
  0b0000_0000, // gpio to set (LOW)
  0b1000_0000  // direction (output)
]))

```



Using it as a I²C bus

```js
import { FT232HBus } from '@johntalton/ft232h/i2c'
import { I2CAddressedBus } from '@johntalton/and-other-delights'
import { ADT7410 } from '@johntalton/adt7410'

// ...

// init sets the chip into mode compatible for I2C communication
// this is required prior to any I2C interactions
// any other command that alter the chips configuration will
// invalidate the bus
await FT232HBus.init(ftDevice)
const bus = new FT232HBus(ftDevice)

// but can now be used as part of any I2CBus sensor
// following example for ADT7410
const DEFAULT_ADDR = 0x48
const sensor = ADT7410.from(new I2CAddressedBus(DEFAULT_ADDR, bus))

// get temperature
const { temperatureC } = await sensor.getTemperature()

```

