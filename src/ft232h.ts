// import { I2CAddressedBus } from '@johntalton/and-other-delights'
// import { sendRecvCommand } from './transfer.js'

import type { BitMode } from './consts.ts'
import { REQUESTS } from './consts.ts'

function assertDataViewNotShared(view: DataView): asserts view is DataView & { buffer: ArrayBuffer } {
	if (typeof SharedArrayBuffer !== 'undefined' && view.buffer instanceof SharedArrayBuffer) {
		throw new TypeError('DataView cannot be backed by a SharedArrayBuffer')
	}
}


export class FT232HCommon {
	static test(): string { return 'hello world' }

	// static async usbReset(device: USBDevice) {
	// 	await device.controlTransferIn({
	// 		requestType: 'vendor',
	// 		recipient: 'device',
	// 		request: 0,
	// 		value: 0,
	// 		index: 0
	// 	})
	// }

	// static async tciFlush(device: USBDevice) {
	// 	await device.controlTransferIn({
	// 		requestType: 'vendor',
	// 		recipient: 'device',
	// 		request: 0,
	// 		value: 2,
	// 		index: 0
	// 	})
	// }

	// static async tcoFlush(device: USBDevice) {
	// 	await device.controlTransferIn({
	// 		requestType: 'vendor',
	// 		recipient: 'device',
	// 		request: 0,
	// 		value: 1,
	// 		index: 0
	// 	})
	// }

	// static async setBaudrate(device: USBDevice, value: number) {
	// 	await device.controlTransferIn({
	// 		requestType: 'vendor',
	// 		recipient: 'device',
	// 		request: 3,
	// 		value,
	// 		index: 0
	// 	})
	// }

	// static async setLineProperty() {}

	// static async writeData(device: USBDevice, bufferSource: BufferSource) {
	// 	await device.transferOut(ep, bufferSource)
	// }
	// static async readData(device: USBDevice) {
	// 	await device.transferIn(ep, length)
	// }

	// static async setBitmode(device: USBDevice, value: number) {
	// 	await device.controlTransferIn({
	// 		requestType: 'vendor',
	// 		recipient: 'device',
	// 		request: 0x0b,
	// 		value,
	// 		index: 0
	// 	})
	// }
	// static async disableBitbang() {
	// 	throw new Error('no impl')
	// }

	// static async readPins() {
	// 	throw new Error('no impl')
	// }

	// static async setLatencyTimer() {
	// 	throw new Error('no impl')
	// }
	// static async getLatencyTimer() {
	// 	throw new Error('no impl')
	// }

	// static async pollModemStatus(device: USBDevice) {

	// 	const SIO_POLL_MODEM_STATUS_REQUEST = 0x05

	// 	const length = 64
	// 	const result = await device.controlTransferIn({
	// 		requestType: 'vendor',
	// 		recipient: 'device',
	// 		request: SIO_POLL_MODEM_STATUS_REQUEST,
	// 		value: 0,
	// 		index: 0

	// 	}, length)

	// 	if(result.status !== 'ok') { }

	// 	console.log(result)

	// 	const usb_val0 = result.data.getUint8(0)
	// 	const usb_val1 = result.data.getUint8(1)

	// 	const status = {
	// 		CTS: isBitSet(usb_val0, 4),
	// 		DTS: isBitSet(usb_val0, 5),
	// 		RI: isBitSet(usb_val0, 6),
	// 		RLSD: isBitSet(usb_val0, 6),

	// 		DR: isBitSet(usb_val1, 0),
	// 		OE: isBitSet(usb_val1, 1),
	// 		PE: isBitSet(usb_val1, 2),
	// 		FE: isBitSet(usb_val1, 3),
	// 		BI: isBitSet(usb_val1, 4),
	// 		THRE: isBitSet(usb_val1, 5),
	// 		TEMT: isBitSet(usb_val1, 6),
	// 		ErrorRCVRFIFO: isBitSet(usb_val1, 7),
	// 	}

	// 	console.log('status', status)
	// }

	// static async setFlowControl() {
	// 	throw new Error('no impl')
	// }
	// static async setFlowControlXONXOFF() {
	// 	throw new Error('no impl')
	// }

	// static async setDTR() {
	// 	throw new Error('no impl')
	// }
	// static async setRTS() {
	// 	throw new Error('no impl')
	// }

	// static async setDTRRTS() {
	// 	throw new Error('no impl')
	// }

	// static async setEventChar() {
	// 	throw new Error('no impl')
	// }
	// static async setErrorChar() {
	// 	throw new Error('no impl')
	// }

}

export class FT232H {
	readonly #device
	readonly #endpointBulkIn: number
	readonly #endpointBulkOut: number

	static async from(device: USBDevice): Promise<FT232H> {
		const { epIn, epOut } = await FT232H.#discoverEndpoints(device)
		return new FT232H(device, epIn, epOut)
	}

	constructor(device: USBDevice, epIn: number, epOut: number) {
		this.#device = device
		this.#endpointBulkIn = epIn
		this.#endpointBulkOut = epOut
	}

	static async #discoverEndpoints(device: USBDevice): Promise<{ epIn: number, epOut: number}> {
		if (device.configuration === null) {
			await device.selectConfiguration(1)
		}
		await device.claimInterface(0)

		if(device.configuration === null) {
			throw new Error('Configuration is NULL')
		}

		const { interfaces } = device.configuration
		const [ iface ] = interfaces
		if(iface === undefined) { throw new Error('Interface is undefined') }
		const { alternate } = iface
		const { endpoints } = alternate

		const epIn = endpoints.find(ep => ep.direction === 'in' && ep.type === 'bulk')
		const epOut = endpoints.find(ep => ep.direction === 'out' && ep.type === 'bulk')

		if(epIn === undefined) { throw new Error('Endpoint In Bulk not found') }
		if(epOut === undefined) { throw new Error('Endpoint Out Bulk not found') }

		return {
			epIn: epIn.endpointNumber,
			epOut: epOut.endpointNumber
		}
	}

	async reset(): Promise<void> {
		await this.#device.controlTransferOut({
			requestType: 'vendor',
			recipient: 'device',
			request: REQUESTS.RESET,
			value: 0,
			index: 0
		})
	}

	async setBitMode(mode: BitMode): Promise<void> {
		await this.#device.controlTransferOut({
			requestType: 'vendor',
			recipient: 'device',
			request: REQUESTS.SET_BITMODE,
			value: mode,
			index: 0
		})
	}

  async sendData(data: BufferSource): Promise<number> {
		// console.log('sendData', data)
    const result = await this.#device.transferOut(this.#endpointBulkOut, data)
		// console.log('sendData result', result)
		if(result.status !== 'ok') { throw new Error('failure sending data') }

		return result.bytesWritten
  }

	async readData(length: number): Promise<DataView<ArrayBuffer>> {
		const result = await this.#device.transferIn(this.#endpointBulkIn, length)
		if(result.status !== 'ok') { throw new Error('failure to read data') }
		if(result.data === undefined) { throw new Error('result data undefined') }

		const buffer = result.data
		assertDataViewNotShared(buffer)

		return buffer
	}
}
