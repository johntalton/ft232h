
/** biome-ignore-all lint/style/noExcessiveLinesPerFile: <explanation> */
/** biome-ignore-all lint/style/noNestedTernary: <explanation> */
/** biome-ignore-all lint/style/useConsistentArrayType: <explanation> */
/** biome-ignore-all lint/performance/noAwaitInLoops: <explanation> */
import type {
	I2CAddress,
	I2CBufferSource,
	I2CBus,
	I2CCommand,
	I2CReadResult,
	I2CWriteResult
} from '@johntalton/and-other-delights'
import {
	CLOCK_DIVISOR_COMMANDS,
	FT232H_ONLY_COMMANDS,
	H_COMMANDS,
	HOST_AND_MPSSE_MODE_COMMANDS,
	PIN_STATE_COMMANDS,
	SHIFT_COMMAND,
	type ShiftCommand,
} from './consts.ts'
import type { FT232H } from './ft232h.ts'
import { range } from './range.ts'
import { STATUS_PREFIX_LENGTH } from './status.ts'

const SDA_PIN_MASK = 0b0000_0010
const SCL_PIN_MASK = 0b0000_0001

const SCL_HIGH_SDA_HIGH: number = SDA_PIN_MASK | SCL_PIN_MASK
const SCL_HIGH_SDA_LOW: number = SCL_PIN_MASK
const SCL_LOW_SDA_HIGH: number = SDA_PIN_MASK
const SCL_LOW_SDA_LOW = 0

const SDA_DIRECTION_OUT = 0b0000_0010
const SCL_DIRECTION_OUT = 0b0000_0001
const SDA_SCL_DIRECTION_OUT: number = SDA_DIRECTION_OUT | SCL_DIRECTION_OUT


export class FT232HI2C {
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

	static #shiftOutByte(command: ShiftCommand, length: number, data: number): Array<number> {
		const lengthL = (length - 1) & 0x0F
		const lengthH = ((length - 1) & 0xF0) >> 8
		return [ command, lengthL, lengthH, data ]
	}

	static #shiftInByte(command: ShiftCommand, length: number): Array<number> {
		const lengthL = (length - 1) & 0x0F
		const lengthH = ((length - 1) & 0xF0) >> 8
		return [ command, lengthL, lengthH ]
	}

	static #shiftOutBits(command: ShiftCommand, length: number, data: number): Array<number> {
		return [ command, length - 1, data ]
	}

	static #shiftInBits(command: ShiftCommand, length: number): Array<number> {
		return [ command, length - 1 ]
	}

	static #gpioSetHigh(pins: number, directions: number): Array<number> {
		return [
			PIN_STATE_COMMANDS.SET_DATA_BITS_HIGH_BYTE,
			pins,
			directions
		]
	}

	static #gpioSetLow(pins: number, directions: number): Array<number> {
		return [
			PIN_STATE_COMMANDS.SET_DATA_BITS_LOW_BYTE,
			pins,
			directions
		]
	}

	// static #gpioGetHigh() {}

	// static #gpioGetLow() {}

	static #consumeAck(): Array<number> {
		return [
			...FT232HI2C.#gpioSetLow(SCL_LOW_SDA_HIGH, SDA_SCL_DIRECTION_OUT), // release SDA
			...FT232HI2C.#shiftInBits(SHIFT_COMMAND.IN_MSB_BITS_POSITIVE_VE, 1),
			...FT232HI2C.#gpioSetLow(SCL_LOW_SDA_LOW, SDA_SCL_DIRECTION_OUT), // regain
		]
	}

	static #start(): Array<number> {
		return [
			// SDA: 1, SCL: 0
			...FT232HI2C.#gpioSetLow(SCL_LOW_SDA_HIGH, SDA_SCL_DIRECTION_OUT),

			// SDA: 1, SCL: 1  (release both lines)
			...FT232HI2C.#gpioSetLow(SCL_HIGH_SDA_HIGH, SDA_SCL_DIRECTION_OUT),
			...FT232HI2C.#gpioSetLow(SCL_HIGH_SDA_HIGH, SDA_SCL_DIRECTION_OUT),
			...FT232HI2C.#gpioSetLow(SCL_HIGH_SDA_HIGH, SDA_SCL_DIRECTION_OUT),
			...FT232HI2C.#gpioSetLow(SCL_HIGH_SDA_HIGH, SDA_SCL_DIRECTION_OUT),
			...FT232HI2C.#gpioSetLow(SCL_HIGH_SDA_HIGH, SDA_SCL_DIRECTION_OUT),

			// SDA: 0, SCL: 1   (low data while clock high)
			...FT232HI2C.#gpioSetLow(SCL_HIGH_SDA_LOW, SDA_SCL_DIRECTION_OUT),
			...FT232HI2C.#gpioSetLow(SCL_HIGH_SDA_LOW, SDA_SCL_DIRECTION_OUT),
			...FT232HI2C.#gpioSetLow(SCL_HIGH_SDA_LOW, SDA_SCL_DIRECTION_OUT),
			...FT232HI2C.#gpioSetLow(SCL_HIGH_SDA_LOW, SDA_SCL_DIRECTION_OUT),
			...FT232HI2C.#gpioSetLow(SCL_HIGH_SDA_LOW, SDA_SCL_DIRECTION_OUT),

			// SDA: 0, SCL: 0  (both low - hold start)
			...FT232HI2C.#gpioSetLow(SCL_LOW_SDA_LOW, SDA_SCL_DIRECTION_OUT),
			...FT232HI2C.#gpioSetLow(SCL_LOW_SDA_LOW, SDA_SCL_DIRECTION_OUT),
			...FT232HI2C.#gpioSetLow(SCL_LOW_SDA_LOW, SDA_SCL_DIRECTION_OUT),
			...FT232HI2C.#gpioSetLow(SCL_LOW_SDA_LOW, SDA_SCL_DIRECTION_OUT),
			...FT232HI2C.#gpioSetLow(SCL_LOW_SDA_LOW, SDA_SCL_DIRECTION_OUT),
		]
	}

	static startWithAddress(addr: number, write = false): Uint8Array<ArrayBuffer> {
		const data = (addr << 1) | (write ? 0 : 1)

		return Uint8Array.from([
			...FT232HI2C.#start(),
			...FT232HI2C.#shiftOutByte(SHIFT_COMMAND.OUT_MSB_BYTES_NEGATIVE_VE, 1, data),
			...FT232HI2C.#consumeAck(),
			HOST_AND_MPSSE_MODE_COMMANDS.SEND_IMMEDIATE
		])
	}

	static writeByte(data: number): Uint8Array<ArrayBuffer> {
		return Uint8Array.from([
			...FT232HI2C.#shiftOutByte(SHIFT_COMMAND.OUT_MSB_BYTES_NEGATIVE_VE, 1, data),
			...FT232HI2C.#consumeAck(),
			HOST_AND_MPSSE_MODE_COMMANDS.SEND_IMMEDIATE
		])
	}

	static repeatStartWithAddress(addr: number, write = false): Uint8Array<ArrayBuffer> {
		const data = (addr << 1) | (write ? 0 : 1)

		return Uint8Array.from([
			...FT232HI2C.#start(),
			...FT232HI2C.#gpioSetLow(SCL_LOW_SDA_HIGH, SDA_SCL_DIRECTION_OUT),
			...FT232HI2C.#shiftOutByte(SHIFT_COMMAND.OUT_MSB_BYTES_NEGATIVE_VE, 1, data),
			...FT232HI2C.#consumeAck(),
			HOST_AND_MPSSE_MODE_COMMANDS.SEND_IMMEDIATE
		])
	}

	static readData(ack = true): Uint8Array<ArrayBuffer> {
		const MSB_ACK_BIT = 0x00
		const MSB_NACK_BIT = 0x80
		const data = ack ? MSB_ACK_BIT : MSB_NACK_BIT

		return Uint8Array.from([
			...FT232HI2C.#gpioSetLow(SCL_LOW_SDA_HIGH, SDA_SCL_DIRECTION_OUT),
			...FT232HI2C.#shiftInByte(SHIFT_COMMAND.IN_MSB_BYTES_POSITIVE_VE, 1),
			...FT232HI2C.#gpioSetLow(SCL_LOW_SDA_LOW, SDA_SCL_DIRECTION_OUT),
			...FT232HI2C.#shiftOutBits(SHIFT_COMMAND.OUT_MSB_BITS_NEGATIVE_VE, 1, data),
			HOST_AND_MPSSE_MODE_COMMANDS.SEND_IMMEDIATE
		])
	}

	static stop(): Uint8Array<ArrayBuffer> {
		return Uint8Array.from([
			// Set SDA low, SCL low
			...FT232HI2C.#gpioSetLow(SCL_LOW_SDA_LOW, SDA_SCL_DIRECTION_OUT),
			...FT232HI2C.#gpioSetLow(SCL_LOW_SDA_LOW, SDA_SCL_DIRECTION_OUT),
			...FT232HI2C.#gpioSetLow(SCL_LOW_SDA_LOW, SDA_SCL_DIRECTION_OUT),
			...FT232HI2C.#gpioSetLow(SCL_LOW_SDA_LOW, SDA_SCL_DIRECTION_OUT),
			...FT232HI2C.#gpioSetLow(SCL_LOW_SDA_LOW, SDA_SCL_DIRECTION_OUT),

			// Set SDA low, SCL high
			...FT232HI2C.#gpioSetLow(SCL_HIGH_SDA_LOW, SDA_SCL_DIRECTION_OUT),
			...FT232HI2C.#gpioSetLow(SCL_HIGH_SDA_LOW, SDA_SCL_DIRECTION_OUT),
			...FT232HI2C.#gpioSetLow(SCL_HIGH_SDA_LOW, SDA_SCL_DIRECTION_OUT),
			...FT232HI2C.#gpioSetLow(SCL_HIGH_SDA_LOW, SDA_SCL_DIRECTION_OUT),
			...FT232HI2C.#gpioSetLow(SCL_HIGH_SDA_LOW, SDA_SCL_DIRECTION_OUT),

			// Set SDA, SCL high
			...FT232HI2C.#gpioSetLow(SCL_HIGH_SDA_HIGH, SDA_SCL_DIRECTION_OUT),

			//
			HOST_AND_MPSSE_MODE_COMMANDS.SEND_IMMEDIATE
		])
	}
}



export async function pollData(device: FT232H): Promise<Uint8Array<ArrayBuffer>> {
	const MAX_POLL_ATTEMPTS = 10
	const DATA_READ_SIZE = 64

	for(let i = 0; i < MAX_POLL_ATTEMPTS; i += 1) {
		const response = await device.readData(DATA_READ_SIZE)
		if(response.byteLength === STATUS_PREFIX_LENGTH) { continue }
		if(response === undefined) { throw new Error('no response') }
		// const status = DeviceStatus.parse(response)

		return new Uint8Array(response.buffer, STATUS_PREFIX_LENGTH)
	}

	throw new Error('no valid data acquired')
}

export function checkAck(data: Uint8Array<ArrayBuffer>): boolean {
	if(data.byteLength !== 1) { throw new Error('not just an ack') }
	const [ byte ] = data
	if(byte === undefined) { return false }

	return  (byte & 0b0000_0001) === 0
}

export async function sendAndReadACK(device: FT232H, transaction: Uint8Array<ArrayBuffer>): Promise<boolean> {
	await device.sendData(transaction)
	const response = await pollData(device)
	return checkAck(response)
}

export async function readData(device: FT232H, length: number, targetBuffer?: I2CBufferSource): Promise<I2CBufferSource> {
	const buffer = (targetBuffer === undefined) ?
		new Uint8Array(length) :
		(ArrayBuffer.isView(targetBuffer) ?
			new Uint8Array(targetBuffer.buffer, targetBuffer.byteOffset, length) :
			new Uint8Array(targetBuffer, 0, length))

	for(let offset = 0; offset < length; offset += 1) {
		const ack = offset + 1 < length // is last byte

		const readByteTransaction = FT232HI2C.readData(ack)
		await device.sendData(readByteTransaction)
		const byteReadResponse = await pollData(device)

		buffer.set(new Uint8Array(byteReadResponse.buffer, byteReadResponse.byteOffset, 1), offset)
	}

	return buffer
}

export async function writeData(device: FT232H, length: number, buffer: I2CBufferSource): Promise<void> {
	const u8 = ArrayBuffer.isView(buffer) ?
		new Uint8Array(buffer.buffer, buffer.byteOffset, length) :
		new Uint8Array(buffer, 0, length)

	for(let i = 0; i < length; i += 1) {
		const data = u8[i]
		if(data === undefined) { throw new Error('data byte undefined') }

		const writeAck = await sendAndReadACK(device, FT232HI2C.writeByte(data))
		if(!writeAck) { throw new Error('write data nack') }
	}
}

export class FT232HBus implements I2CBus {
	readonly name = 'FT232H'
	readonly supportsScan = true
	readonly supportsMultiByteDataAddress = false

	readonly #device: FT232H

	static async init(device: FT232H): Promise<void> {
		const transaction = FT232HI2C.initI2C()
		await device.sendData(transaction)
		const response = await device.readData(64)
		console.log('init', response)
	}

	constructor(device: FT232H) {
		this.#device = device
	}

	// biome-ignore lint/nursery/useThisInClassMethods: close is a noop
	close(): void {
		// noop
	}

	async scan(): Promise<I2CAddress[]> {
		const result: Array<I2CAddress> = []

		const I2C_RANGE_START = 0x08
		const I2C_RANGE_END = 0x77

		for(const addr of range(I2C_RANGE_START, I2C_RANGE_END)) {
			//
			const startAck = await sendAndReadACK(this.#device, FT232HI2C.startWithAddress(addr, true))
			if(startAck) { result.push(addr) }

			// todo reset or send stop?
		}

		return result
	}

	async sendByte(_address: I2CAddress, _byteValue: number): Promise<void> {
		throw new Error('Method not implemented.')
	}

	async readI2cBlock(address: I2CAddress, cmd: I2CCommand, length: number, targetBuffer?: I2CBufferSource): Promise<I2CReadResult> {
		if(Array.isArray(cmd)) { throw new Error('single command byte only') }

		//
		const startAck = await sendAndReadACK(this.#device, FT232HI2C.startWithAddress(address, true))
		if(!startAck) { throw new Error('start with address nack') }

		//
		const commandAck = await sendAndReadACK(this.#device, FT232HI2C.writeByte(cmd))
		if(!commandAck) { throw new Error('command nack') }

		//
		const repeatStartAck = await sendAndReadACK(this.#device, FT232HI2C.repeatStartWithAddress(address))
		if(!repeatStartAck) { throw new Error('repeat start nack') }

		//
		const buffer = await readData(this.#device, length, targetBuffer)

		//
		await this.#device.sendData(FT232HI2C.stop())

		return {
			bytesRead: length,
			buffer
		}
	}

	async writeI2cBlock(address: I2CAddress, cmd: I2CCommand, length: number, buffer: I2CBufferSource): Promise<I2CWriteResult> {
		if(Array.isArray(cmd)) { throw new Error('single command byte only') }

		//
		const startAck = await sendAndReadACK(this.#device, FT232HI2C.startWithAddress(address, true))
		if(!startAck) { throw new Error('start with address nack') }

		//
		const commandAck = await sendAndReadACK(this.#device, FT232HI2C.writeByte(cmd))
		if(!commandAck) { throw new Error('command nack') }

		//
		await writeData(this.#device, length, buffer)

		//
		await this.#device.sendData(FT232HI2C.stop())

		return {
			bytesWritten: length,
			buffer
		}
	}

	async i2cRead(address: I2CAddress, length: number, targetBuffer?: I2CBufferSource): Promise<I2CReadResult> {
		//
		const startAck = await sendAndReadACK(this.#device, FT232HI2C.startWithAddress(address))
		if(!startAck) { throw new Error('start with address nack') }

		//
		const buffer = await readData(this.#device, length, targetBuffer)

		//
		await this.#device.sendData(FT232HI2C.stop())

		return {
			bytesRead: length,
			buffer
		}
	}

	async i2cWrite(address: I2CAddress, length: number, buffer: I2CBufferSource): Promise<I2CWriteResult> {
		//
		const startAck = await sendAndReadACK(this.#device, FT232HI2C.startWithAddress(address, true))
		if(!startAck) { throw new Error('start with address nack') }

		//
		await writeData(this.#device, length, buffer)

		//
		await this.#device.sendData(FT232HI2C.stop())

		return {
			bytesWritten: length,
			buffer
		}
	}
}
