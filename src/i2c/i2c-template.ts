/** biome-ignore-all lint/style/useConsistentArrayType: <explanation> */
import {
	CLOCK_DIVISOR_COMMANDS,
	FT232H_ONLY_COMMANDS,
	H_COMMANDS,
	HOST_AND_MPSSE_MODE_COMMANDS,
	PIN_STATE_COMMANDS,
	SHIFT_COMMAND
} from '../mpsse/command.ts'
import { MPSSETemplate } from '../mpsse/mpsse-template.ts'

const SDA_PIN_MASK = 0b0000_0010
const SCL_PIN_MASK = 0b0000_0001

const SCL_HIGH_SDA_HIGH: number = SDA_PIN_MASK | SCL_PIN_MASK
const SCL_HIGH_SDA_LOW: number = SCL_PIN_MASK
const SCL_LOW_SDA_HIGH: number = SDA_PIN_MASK
const SCL_LOW_SDA_LOW = 0

const SDA_DIRECTION_OUT = 0b0000_0010
const SCL_DIRECTION_OUT = 0b0000_0001
const SDA_SCL_DIRECTION_OUT: number = SDA_DIRECTION_OUT | SCL_DIRECTION_OUT


export class I2CTemplate {
	static initI2C(): Uint8Array<ArrayBuffer> {
		return Uint8Array.from([
			H_COMMANDS.DISABLE_CLOCK_DIVIDE_BY_FIVE,
			H_COMMANDS.ENABLE_THREE_PHASE_CLOCKING,
			FT232H_ONLY_COMMANDS.SET_IO_ONLY_DRIVE_LOW, 0b0000_0111, 0x00, // low pins as open-drain
			PIN_STATE_COMMANDS.SET_DATA_BITS_LOW_BYTE, SCL_HIGH_SDA_HIGH, SDA_SCL_DIRECTION_OUT, // value, direction
			CLOCK_DIVISOR_COMMANDS.SET_CLK_DIVISOR, 0x4A, 0x01, // ~100kHz

			HOST_AND_MPSSE_MODE_COMMANDS.SEND_IMMEDIATE
		])
	}

	static #consumeAck(): Array<number> {
		return [
			...MPSSETemplate.gpioSetLow(SCL_LOW_SDA_HIGH, SDA_SCL_DIRECTION_OUT), // release SDA
			...MPSSETemplate.shiftInBits(SHIFT_COMMAND.IN_MSB_BITS_POSITIVE_VE, 1),
			...MPSSETemplate.gpioSetLow(SCL_LOW_SDA_LOW, SDA_SCL_DIRECTION_OUT), // regain
		]
	}

	static #start(): Array<number> {
		return [
			// SDA: 1, SCL: 0
			...MPSSETemplate.gpioSetLow(SCL_LOW_SDA_HIGH, SDA_SCL_DIRECTION_OUT),

			// SDA: 1, SCL: 1  (release both lines)
			...MPSSETemplate.gpioSetLow(SCL_HIGH_SDA_HIGH, SDA_SCL_DIRECTION_OUT),
			...MPSSETemplate.gpioSetLow(SCL_HIGH_SDA_HIGH, SDA_SCL_DIRECTION_OUT),
			...MPSSETemplate.gpioSetLow(SCL_HIGH_SDA_HIGH, SDA_SCL_DIRECTION_OUT),
			...MPSSETemplate.gpioSetLow(SCL_HIGH_SDA_HIGH, SDA_SCL_DIRECTION_OUT),
			...MPSSETemplate.gpioSetLow(SCL_HIGH_SDA_HIGH, SDA_SCL_DIRECTION_OUT),

			// SDA: 0, SCL: 1   (low data while clock high)
			...MPSSETemplate.gpioSetLow(SCL_HIGH_SDA_LOW, SDA_SCL_DIRECTION_OUT),
			...MPSSETemplate.gpioSetLow(SCL_HIGH_SDA_LOW, SDA_SCL_DIRECTION_OUT),
			...MPSSETemplate.gpioSetLow(SCL_HIGH_SDA_LOW, SDA_SCL_DIRECTION_OUT),
			...MPSSETemplate.gpioSetLow(SCL_HIGH_SDA_LOW, SDA_SCL_DIRECTION_OUT),
			...MPSSETemplate.gpioSetLow(SCL_HIGH_SDA_LOW, SDA_SCL_DIRECTION_OUT),

			// SDA: 0, SCL: 0  (both low - hold start)
			...MPSSETemplate.gpioSetLow(SCL_LOW_SDA_LOW, SDA_SCL_DIRECTION_OUT),
			...MPSSETemplate.gpioSetLow(SCL_LOW_SDA_LOW, SDA_SCL_DIRECTION_OUT),
			...MPSSETemplate.gpioSetLow(SCL_LOW_SDA_LOW, SDA_SCL_DIRECTION_OUT),
			...MPSSETemplate.gpioSetLow(SCL_LOW_SDA_LOW, SDA_SCL_DIRECTION_OUT),
			...MPSSETemplate.gpioSetLow(SCL_LOW_SDA_LOW, SDA_SCL_DIRECTION_OUT),
		]
	}

	static startWithAddress(addr: number, write = false): Uint8Array<ArrayBuffer> {
		const data = (addr << 1) | (write ? 0 : 1)

		return Uint8Array.from([
			...I2CTemplate.#start(),
			...MPSSETemplate.shiftOutByte(SHIFT_COMMAND.OUT_MSB_BYTES_NEGATIVE_VE, 1, data),
			...I2CTemplate.#consumeAck(),
			HOST_AND_MPSSE_MODE_COMMANDS.SEND_IMMEDIATE
		])
	}

	static writeByte(data: number): Uint8Array<ArrayBuffer> {
		return Uint8Array.from([
			...MPSSETemplate.shiftOutByte(SHIFT_COMMAND.OUT_MSB_BYTES_NEGATIVE_VE, 1, data),
			...I2CTemplate.#consumeAck(),
			HOST_AND_MPSSE_MODE_COMMANDS.SEND_IMMEDIATE
		])
	}

	static repeatStartWithAddress(addr: number, write = false): Uint8Array<ArrayBuffer> {
		const data = (addr << 1) | (write ? 0 : 1)

		return Uint8Array.from([
			...I2CTemplate.#start(),
			...MPSSETemplate.gpioSetLow(SCL_LOW_SDA_HIGH, SDA_SCL_DIRECTION_OUT),
			...MPSSETemplate.shiftOutByte(SHIFT_COMMAND.OUT_MSB_BYTES_NEGATIVE_VE, 1, data),
			...I2CTemplate.#consumeAck(),
			HOST_AND_MPSSE_MODE_COMMANDS.SEND_IMMEDIATE
		])
	}

	static readData(ack = true): Uint8Array<ArrayBuffer> {
		const MSB_ACK_BIT = 0x00
		const MSB_NACK_BIT = 0x80
		const data = ack ? MSB_ACK_BIT : MSB_NACK_BIT

		return Uint8Array.from([
			...MPSSETemplate.gpioSetLow(SCL_LOW_SDA_HIGH, SDA_SCL_DIRECTION_OUT),
			...MPSSETemplate.shiftInByte(SHIFT_COMMAND.IN_MSB_BYTES_POSITIVE_VE, 1),
			...MPSSETemplate.gpioSetLow(SCL_LOW_SDA_LOW, SDA_SCL_DIRECTION_OUT),
			...MPSSETemplate.shiftOutBits(SHIFT_COMMAND.OUT_MSB_BITS_NEGATIVE_VE, 1, data),
			HOST_AND_MPSSE_MODE_COMMANDS.SEND_IMMEDIATE
		])
	}

	static stop(): Uint8Array<ArrayBuffer> {
		return Uint8Array.from([
			// Set SDA low, SCL low
			...MPSSETemplate.gpioSetLow(SCL_LOW_SDA_LOW, SDA_SCL_DIRECTION_OUT),
			...MPSSETemplate.gpioSetLow(SCL_LOW_SDA_LOW, SDA_SCL_DIRECTION_OUT),
			...MPSSETemplate.gpioSetLow(SCL_LOW_SDA_LOW, SDA_SCL_DIRECTION_OUT),
			...MPSSETemplate.gpioSetLow(SCL_LOW_SDA_LOW, SDA_SCL_DIRECTION_OUT),
			...MPSSETemplate.gpioSetLow(SCL_LOW_SDA_LOW, SDA_SCL_DIRECTION_OUT),

			// Set SDA low, SCL high
			...MPSSETemplate.gpioSetLow(SCL_HIGH_SDA_LOW, SDA_SCL_DIRECTION_OUT),
			...MPSSETemplate.gpioSetLow(SCL_HIGH_SDA_LOW, SDA_SCL_DIRECTION_OUT),
			...MPSSETemplate.gpioSetLow(SCL_HIGH_SDA_LOW, SDA_SCL_DIRECTION_OUT),
			...MPSSETemplate.gpioSetLow(SCL_HIGH_SDA_LOW, SDA_SCL_DIRECTION_OUT),
			...MPSSETemplate.gpioSetLow(SCL_HIGH_SDA_LOW, SDA_SCL_DIRECTION_OUT),

			// Set SDA, SCL high
			...MPSSETemplate.gpioSetLow(SCL_HIGH_SDA_HIGH, SDA_SCL_DIRECTION_OUT),

			//
			HOST_AND_MPSSE_MODE_COMMANDS.SEND_IMMEDIATE
		])
	}
}
