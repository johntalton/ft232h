/** biome-ignore-all lint/nursery/useThisInClassMethods: <explanation> */
/** biome-ignore-all lint/style/noExcessiveLinesPerFile: <explanation> */
/** biome-ignore-all lint/style/useConsistentArrayType: <explanation> */
/** biome-ignore-all lint/performance/noAwaitInLoops: <explanation> */
/** biome-ignore-all lint/style/useExportsLast: <explanation> */
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
	MSB_FIRST_CLOCK_COMMANDS,
	PIN_STATE_COMMANDS
} from './consts.ts'
import type { FT232H } from './ft232h.ts'
// import { DeviceStatus } from './status.ts'






const SDA_PIN_MASK = 0b0000_0010
const SCL_PIN_MASK = 0b0000_0001

const SCL_HIGH_SDA_HIGH: number = SDA_PIN_MASK | SCL_PIN_MASK
const SCL_HIGH_SDA_LOW: number = SCL_PIN_MASK
const SCL_LOW_SDA_HIGH: number = SDA_PIN_MASK
const SCL_LOW_SDA_LOW = 0

const SDA_DIRECTION_OUT = 0b0000_0010
// const SDA_DIRECTION_IN = 0b0000_0000
const SCL_DIRECTION_OUT = 0b0000_0001
// const SCL_DIRECTION_IN = 0b0000_0000

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

	static #start(): Array<number> {
		return [
			// SDA: 1, SCL: 1  (release both lines)
			PIN_STATE_COMMANDS.SET_DATA_BITS_LOW_BYTE, SCL_HIGH_SDA_HIGH, SDA_SCL_DIRECTION_OUT,
			PIN_STATE_COMMANDS.SET_DATA_BITS_LOW_BYTE, SCL_HIGH_SDA_HIGH, SDA_SCL_DIRECTION_OUT,
			PIN_STATE_COMMANDS.SET_DATA_BITS_LOW_BYTE, SCL_HIGH_SDA_HIGH, SDA_SCL_DIRECTION_OUT,
			PIN_STATE_COMMANDS.SET_DATA_BITS_LOW_BYTE, SCL_HIGH_SDA_HIGH, SDA_SCL_DIRECTION_OUT,
			PIN_STATE_COMMANDS.SET_DATA_BITS_LOW_BYTE, SCL_HIGH_SDA_HIGH, SDA_SCL_DIRECTION_OUT,

			// SDA: 0, SCL: 1   (low data while clock high)
			PIN_STATE_COMMANDS.SET_DATA_BITS_LOW_BYTE, SCL_HIGH_SDA_LOW, SDA_SCL_DIRECTION_OUT,
			PIN_STATE_COMMANDS.SET_DATA_BITS_LOW_BYTE, SCL_HIGH_SDA_LOW, SDA_SCL_DIRECTION_OUT,
			PIN_STATE_COMMANDS.SET_DATA_BITS_LOW_BYTE, SCL_HIGH_SDA_LOW, SDA_SCL_DIRECTION_OUT,
			PIN_STATE_COMMANDS.SET_DATA_BITS_LOW_BYTE, SCL_HIGH_SDA_LOW, SDA_SCL_DIRECTION_OUT,
			PIN_STATE_COMMANDS.SET_DATA_BITS_LOW_BYTE, SCL_HIGH_SDA_LOW, SDA_SCL_DIRECTION_OUT,

			// SDA: 0, SCL: 0  (both low - hold start)
			PIN_STATE_COMMANDS.SET_DATA_BITS_LOW_BYTE, SCL_LOW_SDA_LOW, SDA_SCL_DIRECTION_OUT,
			PIN_STATE_COMMANDS.SET_DATA_BITS_LOW_BYTE, SCL_LOW_SDA_LOW, SDA_SCL_DIRECTION_OUT,
			PIN_STATE_COMMANDS.SET_DATA_BITS_LOW_BYTE, SCL_LOW_SDA_LOW, SDA_SCL_DIRECTION_OUT,
			PIN_STATE_COMMANDS.SET_DATA_BITS_LOW_BYTE, SCL_LOW_SDA_LOW, SDA_SCL_DIRECTION_OUT,
			PIN_STATE_COMMANDS.SET_DATA_BITS_LOW_BYTE, SCL_LOW_SDA_LOW, SDA_SCL_DIRECTION_OUT,
		]
	}

	static readBlock_Prefix(addr: number): Uint8Array<ArrayBuffer> {
		const transaction = new Uint8Array([
			...FT232HI2C.#start(),

			// write 1 byte address
			MSB_FIRST_CLOCK_COMMANDS.OUT_BYTES_NEGATIVE_VE, 0x00, 0x00, (addr << 1) | 0,

			// consume ACK for address
			PIN_STATE_COMMANDS.SET_DATA_BITS_LOW_BYTE, SCL_LOW_SDA_HIGH, SDA_SCL_DIRECTION_OUT,
			MSB_FIRST_CLOCK_COMMANDS.IN_BITS_POSITIVE_VE, 0x00,
			PIN_STATE_COMMANDS.SET_DATA_BITS_LOW_BYTE, SCL_LOW_SDA_LOW, SDA_SCL_DIRECTION_OUT, // regain
		])

		return transaction
	}

	static readBlock_Command(cmd: number): Array<number> {
		return [
			// write 1 byte command
			MSB_FIRST_CLOCK_COMMANDS.OUT_BYTES_NEGATIVE_VE, 0x00, 0x00, cmd,

			// // consume ACK for data (release SDA)
			PIN_STATE_COMMANDS.SET_DATA_BITS_LOW_BYTE, SCL_LOW_SDA_HIGH, SDA_SCL_DIRECTION_OUT,
			MSB_FIRST_CLOCK_COMMANDS.IN_BITS_POSITIVE_VE, 0x00,
			PIN_STATE_COMMANDS.SET_DATA_BITS_LOW_BYTE, SCL_LOW_SDA_LOW, SDA_SCL_DIRECTION_OUT, // regain

			HOST_AND_MPSSE_MODE_COMMANDS.SEND_IMMEDIATE
		]
	}

	static #repeatStart(): Array<number> {
		return [
			// SDA: 1, SCL: 0
			PIN_STATE_COMMANDS.SET_DATA_BITS_LOW_BYTE, SCL_LOW_SDA_HIGH, SDA_SCL_DIRECTION_OUT,
			PIN_STATE_COMMANDS.SET_DATA_BITS_LOW_BYTE, SCL_LOW_SDA_HIGH, SDA_SCL_DIRECTION_OUT,
			PIN_STATE_COMMANDS.SET_DATA_BITS_LOW_BYTE, SCL_LOW_SDA_HIGH, SDA_SCL_DIRECTION_OUT,
			PIN_STATE_COMMANDS.SET_DATA_BITS_LOW_BYTE, SCL_LOW_SDA_HIGH, SDA_SCL_DIRECTION_OUT,
			PIN_STATE_COMMANDS.SET_DATA_BITS_LOW_BYTE, SCL_LOW_SDA_HIGH, SDA_SCL_DIRECTION_OUT,

			// SDA: 1, SCL: 1
			PIN_STATE_COMMANDS.SET_DATA_BITS_LOW_BYTE, SCL_HIGH_SDA_HIGH, SDA_SCL_DIRECTION_OUT,
			PIN_STATE_COMMANDS.SET_DATA_BITS_LOW_BYTE, SCL_HIGH_SDA_HIGH, SDA_SCL_DIRECTION_OUT,
			PIN_STATE_COMMANDS.SET_DATA_BITS_LOW_BYTE, SCL_HIGH_SDA_HIGH, SDA_SCL_DIRECTION_OUT,
			PIN_STATE_COMMANDS.SET_DATA_BITS_LOW_BYTE, SCL_HIGH_SDA_HIGH, SDA_SCL_DIRECTION_OUT,
			PIN_STATE_COMMANDS.SET_DATA_BITS_LOW_BYTE, SCL_HIGH_SDA_HIGH, SDA_SCL_DIRECTION_OUT,

			// SDA: 0, SCL: 1
			PIN_STATE_COMMANDS.SET_DATA_BITS_LOW_BYTE, SCL_HIGH_SDA_LOW, SDA_SCL_DIRECTION_OUT,
			PIN_STATE_COMMANDS.SET_DATA_BITS_LOW_BYTE, SCL_HIGH_SDA_LOW, SDA_SCL_DIRECTION_OUT,
			PIN_STATE_COMMANDS.SET_DATA_BITS_LOW_BYTE, SCL_HIGH_SDA_LOW, SDA_SCL_DIRECTION_OUT,
			PIN_STATE_COMMANDS.SET_DATA_BITS_LOW_BYTE, SCL_HIGH_SDA_LOW, SDA_SCL_DIRECTION_OUT,
			PIN_STATE_COMMANDS.SET_DATA_BITS_LOW_BYTE, SCL_HIGH_SDA_LOW, SDA_SCL_DIRECTION_OUT,

			// SDA: 0, SCL: 0  (both low - hold start)
			PIN_STATE_COMMANDS.SET_DATA_BITS_LOW_BYTE, SCL_LOW_SDA_LOW, SDA_SCL_DIRECTION_OUT,
			PIN_STATE_COMMANDS.SET_DATA_BITS_LOW_BYTE, SCL_LOW_SDA_LOW, SDA_SCL_DIRECTION_OUT,
			PIN_STATE_COMMANDS.SET_DATA_BITS_LOW_BYTE, SCL_LOW_SDA_LOW, SDA_SCL_DIRECTION_OUT,
			PIN_STATE_COMMANDS.SET_DATA_BITS_LOW_BYTE, SCL_LOW_SDA_LOW, SDA_SCL_DIRECTION_OUT,
			PIN_STATE_COMMANDS.SET_DATA_BITS_LOW_BYTE, SCL_LOW_SDA_LOW, SDA_SCL_DIRECTION_OUT,

		]
	}

	static readBlock_RepeatStart_Read(addr: number): Array<number> {
		return [
			...FT232HI2C.#repeatStart(),

			PIN_STATE_COMMANDS.SET_DATA_BITS_LOW_BYTE, SCL_LOW_SDA_HIGH, SDA_SCL_DIRECTION_OUT,

			// write 1 byte address
			MSB_FIRST_CLOCK_COMMANDS.OUT_BYTES_NEGATIVE_VE, 0x00, 0x00, (addr << 1) | 1,

			// consume ACK for address
			PIN_STATE_COMMANDS.SET_DATA_BITS_LOW_BYTE, SCL_LOW_SDA_HIGH, SDA_SCL_DIRECTION_OUT,
			MSB_FIRST_CLOCK_COMMANDS.IN_BITS_POSITIVE_VE, 0x00,
			PIN_STATE_COMMANDS.SET_DATA_BITS_LOW_BYTE, SCL_LOW_SDA_LOW, SDA_SCL_DIRECTION_OUT, // regain

			HOST_AND_MPSSE_MODE_COMMANDS.SEND_IMMEDIATE
		]
	}

	static readBlock_Byte(ack = true): Array<number> {
		return [
			PIN_STATE_COMMANDS.SET_DATA_BITS_LOW_BYTE, SCL_LOW_SDA_HIGH, SDA_SCL_DIRECTION_OUT,

			//
			MSB_FIRST_CLOCK_COMMANDS.IN_BYTES_POSITIVE_VE, 0x00, 0x00,
			// MSB_FIRST_CLOCK_COMMANDS.IN_BITS_POSITIVE_VE, 0x07, 0x00,

			// product ACK/NACK
			PIN_STATE_COMMANDS.SET_DATA_BITS_LOW_BYTE, SCL_LOW_SDA_LOW, SDA_SCL_DIRECTION_OUT,
			MSB_FIRST_CLOCK_COMMANDS.OUT_BITS_NEGATIVE_VE, 0x00, ack ? 0x00 : 0x80,


			HOST_AND_MPSSE_MODE_COMMANDS.SEND_IMMEDIATE,

			// PIN_STATE_COMMANDS.SET_DATA_BITS_LOW_BYTE, SCL_LOW_SDA_HIGH, SDA_SCL_DIRECTION_OUT
		]
	}

	static readBlock_Stop(): Array<number> {
		return [
			//
			PIN_STATE_COMMANDS.SET_DATA_BITS_LOW_BYTE, SCL_LOW_SDA_LOW, SDA_SCL_DIRECTION_OUT,
			PIN_STATE_COMMANDS.SET_DATA_BITS_LOW_BYTE, SCL_LOW_SDA_LOW, SDA_SCL_DIRECTION_OUT,
			PIN_STATE_COMMANDS.SET_DATA_BITS_LOW_BYTE, SCL_LOW_SDA_LOW, SDA_SCL_DIRECTION_OUT,
			PIN_STATE_COMMANDS.SET_DATA_BITS_LOW_BYTE, SCL_LOW_SDA_LOW, SDA_SCL_DIRECTION_OUT,
			PIN_STATE_COMMANDS.SET_DATA_BITS_LOW_BYTE, SCL_LOW_SDA_LOW, SDA_SCL_DIRECTION_OUT,

			// Set SDA low, SCL high
			PIN_STATE_COMMANDS.SET_DATA_BITS_LOW_BYTE, SCL_HIGH_SDA_LOW, SDA_SCL_DIRECTION_OUT,
			PIN_STATE_COMMANDS.SET_DATA_BITS_LOW_BYTE, SCL_HIGH_SDA_LOW, SDA_SCL_DIRECTION_OUT,
			PIN_STATE_COMMANDS.SET_DATA_BITS_LOW_BYTE, SCL_HIGH_SDA_LOW, SDA_SCL_DIRECTION_OUT,
			PIN_STATE_COMMANDS.SET_DATA_BITS_LOW_BYTE, SCL_HIGH_SDA_LOW, SDA_SCL_DIRECTION_OUT,
			PIN_STATE_COMMANDS.SET_DATA_BITS_LOW_BYTE, SCL_HIGH_SDA_LOW, SDA_SCL_DIRECTION_OUT,

			// Set SDA, SCL high
			PIN_STATE_COMMANDS.SET_DATA_BITS_LOW_BYTE, SCL_HIGH_SDA_HIGH, SDA_SCL_DIRECTION_OUT,


			//
			HOST_AND_MPSSE_MODE_COMMANDS.SEND_IMMEDIATE
		]
	}

}

async function pollData(device: FT232H): Promise<Uint8Array<ArrayBuffer>> {
	for(let i = 0; i < 10; i+=1) {
		const response = await device.readData(64)
		if(response.byteLength === 2) { continue }

		if(response === undefined) { throw new Error('no response') }

		// const status = DeviceStatus.parse(response)
		// console.log('status', status)

		return new Uint8Array(response.buffer, 2)
	}

	throw new Error('no valid data acquired')
}

function checkAck(data: Uint8Array<ArrayBuffer>): boolean {
	if(data.byteLength !== 1) { throw new Error('not just an ack') }
	const [ byte ] = data
	if(byte === undefined) { return false }

	return  (byte & 0b0000_0001) === 0
}

export class FT232HBus implements I2CBus {
	readonly name = 'FT232H'
	readonly supportsScan = false
	readonly supportsMultiByteDataAddress = false

	readonly #device: FT232H

	static async init(device: FT232H): Promise<void> {
		console.log('init i2c mode')
		const transaction = FT232HI2C.initI2C()
		await device.sendData(transaction)
		console.log('data sent')
		const response = await device.readData(64)
		console.log('init', response)
	}

	constructor(device: FT232H) {
		this.#device = device
	}

	close(): void {
		// noop
	}

	async scan(): Promise<I2CAddress[]> {
		throw new Error('Method not implemented.')
	}

	async sendByte(_address: I2CAddress, _byteValue: number): Promise<void> {
		throw new Error('Method not implemented.')
	}

	async readI2cBlock(address: I2CAddress, cmd: I2CCommand, length: number, targetBuffer?: I2CBufferSource): Promise<I2CReadResult> {
		console.log('readI2CBlock', address, cmd, length, targetBuffer)

		if(Array.isArray(cmd)) { throw new Error('single command byte only') }

		//
		const prefixTransaction = FT232HI2C.readBlock_Prefix(address)
		await this.#device.sendData(prefixTransaction)
		const prefixResponse = await pollData(this.#device)
		console.log('prefix ack', checkAck(prefixResponse))

		//
		const commandTransaction = FT232HI2C.readBlock_Command(cmd)
		await this.#device.sendData(Uint8Array.from(commandTransaction))
		const commandResponse = await pollData(this.#device)
		console.log('command ack', checkAck(commandResponse))

		//
		const repeatStartAddressReadTransaction = FT232HI2C.readBlock_RepeatStart_Read(address)
		await this.#device.sendData(Uint8Array.from(repeatStartAddressReadTransaction))
		const repeatStartResponse = await pollData(this.#device)
		console.log('repeat start ack', checkAck(repeatStartResponse))


		const parts: Array<Uint8Array<ArrayBuffer>> = []
		for(let i = 0; i < length; i += 1) {
			//
			const ack = i + 1 < length

			const readByteTransaction = FT232HI2C.readBlock_Byte(ack)
			await this.#device.sendData(Uint8Array.from(readByteTransaction))
			const byteReadResponse = await pollData(this.#device)

			// two bytes read - first data second ack
			console.log('byte read', i, byteReadResponse)

			parts.push(new Uint8Array(byteReadResponse.buffer, byteReadResponse.byteOffset, 1))
		}

		//
		const stopTransaction = FT232HI2C.readBlock_Stop()
		await this.#device.sendData(Uint8Array.from(stopTransaction))

		//
		const blob = new Blob(parts)
		const buffer = await blob.bytes()

		return {
			bytesRead: length,
			buffer
		}
	}

	async writeI2cBlock(_address: I2CAddress, _cmd: I2CCommand, _length: number, _buffer: I2CBufferSource): Promise<I2CWriteResult> {
		throw new Error('Method not implemented.')
	}

	async i2cRead(_address: I2CAddress, _length: number, _targetBuffer?: I2CBufferSource): Promise<I2CReadResult> {
		throw new Error('Method not implemented.')
	}

	async i2cWrite(_address: I2CAddress, _length: number, _buffer: I2CBufferSource): Promise<I2CWriteResult> {
		throw new Error('Method not implemented.')
	}
}
