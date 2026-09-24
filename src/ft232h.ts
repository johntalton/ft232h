/** biome-ignore-all lint/style/noNestedTernary: <explanation> */
import type { BitMode, ModemControl, RequestType } from './consts.ts'
import { REQUESTS, RESET_USB } from './consts.ts'
import {
	DeviceStatus,
	type DeviceStatusInfo,
	STATUS_PREFIX_LENGTH,
} from './status.ts'

export const USB_TRANSFER_OK: USBTransferStatus = 'ok'
export const USB_TRANSFER_STALL: USBTransferStatus = 'stall'
export const USB_TRANSFER_BABBLE: USBTransferStatus = 'babble'


export const REQUEST_TYPE_VENDOR = 'vendor'
export const RECIPIENT_DEVICE = 'device'

export const INTERFACE_DIRECTION_IN = 'in'
export const INTERFACE_DIRECTION_OUT = 'out'
export const INTERFACE_TYPE_BULK = 'bulk'

export const DEFAULT_CONFIGURATION_NUMBER = 1
export const DEFAULT_INTERFACE_NUMBER = 0


export function assertDataViewNotShared(view: DataView): asserts view is DataView & { buffer: ArrayBuffer } {
	if (typeof SharedArrayBuffer !== 'undefined' && view.buffer instanceof SharedArrayBuffer) {
		throw new TypeError('DataView cannot be backed by a SharedArrayBuffer')
	}
}

export class FT232H {
	readonly #device
	readonly #endpointBulkIn: number
	readonly #endpointBulkOut: number
	readonly #interfaceNumber: number

	static async from(device: USBDevice): Promise<FT232H> {
		const { interfaceNumber, epIn, epOut } = await FT232H.#discoverEndpoints(device)
		return new FT232H(device, interfaceNumber, epIn, epOut)
	}

	constructor(device: USBDevice, interfaceNumber: number, epIn: number, epOut: number) {
		this.#device = device
		this.#endpointBulkIn = epIn
		this.#endpointBulkOut = epOut
		this.#interfaceNumber = interfaceNumber
	}

	static async #discoverEndpoints(device: USBDevice): Promise<{ interfaceNumber: number, epIn: number, epOut: number}> {
		if (device.configuration === null) {
			await device.selectConfiguration(DEFAULT_CONFIGURATION_NUMBER)
		}
		await device.claimInterface(DEFAULT_INTERFACE_NUMBER)

		if(device.configuration === null) {
			throw new Error('Configuration is NULL')
		}

		const { interfaces } = device.configuration
		const [ iface ] = interfaces
		if(iface === undefined) { throw new Error('Interface is undefined') }
		const { alternate, interfaceNumber } = iface
		const { endpoints } = alternate

		const epIn = endpoints.find(ep => ep.direction === INTERFACE_DIRECTION_IN && ep.type === INTERFACE_TYPE_BULK)
		const epOut = endpoints.find(ep => ep.direction === INTERFACE_DIRECTION_OUT && ep.type === INTERFACE_TYPE_BULK)

		if(epIn === undefined) { throw new Error('Endpoint In Bulk not found') }
		if(epOut === undefined) { throw new Error('Endpoint Out Bulk not found') }

		return {
			interfaceNumber,
			epIn: epIn.endpointNumber,
			epOut: epOut.endpointNumber
		}
	}

	async #requestIn(request: RequestType, length: number): Promise<USBInTransferResult> {
		return this.#device.controlTransferIn({
			requestType: REQUEST_TYPE_VENDOR,
			recipient: RECIPIENT_DEVICE,
			request,
			value: 0,
			index: this.#interfaceNumber
		}, length)
	}

	async #requestOut(request: RequestType, value: number): Promise<USBOutTransferResult> {
		return this.#device.controlTransferOut({
			requestType: REQUEST_TYPE_VENDOR,
			recipient: RECIPIENT_DEVICE,
			request,
			value,
			index: this.#interfaceNumber
		})
	}

	async reset(kind = RESET_USB.RESET): Promise<void> {
		await this.#requestOut(REQUESTS.RESET, kind)
	}

	async setBitMode(mode: BitMode): Promise<void> {
		const gpioInit = 0
		const value = mode | gpioInit
		await this.#requestOut(REQUESTS.SET_BITMODE, value)
	}

	async getModemStatus(): Promise<DeviceStatusInfo|undefined> {
		const status = await this.#requestIn(REQUESTS.POLL_MODEM_STATUS, STATUS_PREFIX_LENGTH)
		if(status.status !== USB_TRANSFER_OK) { throw new Error('status not ok') }
		if(status.data === undefined) { throw new Error('undefined data') }
		assertDataViewNotShared(status.data)
		return DeviceStatus.parse(status.data)
	}

	async getLatencyTimer(): Promise<number> {
		const result = await this.#requestIn(REQUESTS.GET_LATENCY_TIMER, 1)
		if(result.status !== USB_TRANSFER_OK) { throw new Error('status not ok') }
		if(result.data === undefined) { throw new Error('undefined data') }

		const latency = result.data.getUint8(0)
		return latency
	}

	async setLatencyTimer(latency: number): Promise<void> {
		if(!Number.isInteger(latency)) { throw new TypeError('latency is not valid integer') }
		if(latency < 0 || latency > 255) { throw new RangeError('latency out of range') }

		const result = await this.#requestOut(REQUESTS.SET_LATENCY_TIMER, latency)
		if(result.status !== USB_TRANSFER_OK) { throw new Error('status not ok') }
	}

	async readPins(): Promise<number> {
		const result = await this.#requestIn(REQUESTS.READ_PINS, 1)
		if(result.status !== USB_TRANSFER_OK) { throw new Error('status not ok') }
		if(result.data === undefined) { throw new Error('undefined data') }
		return result.data.getUint8(0)
	}

	async setModemControl(control: ModemControl): Promise<void> {
		const DTR_ENABLE_BIT = 0x01_00
		const RTS_ENABLE_BIT = 0x02_00
		const DTR_SET = 0x01
		const RTS_SET = 0x02

		const setDTR = control.DataTerminalReady !== undefined
		const setRTS = control.RequestToSend !== undefined
		const dtrValue = setDTR ? DTR_ENABLE_BIT | (control.DataTerminalReady ? DTR_SET : 0) : 0
		const rtsValue = setRTS ? RTS_ENABLE_BIT | (control.RequestToSend ? RTS_SET : 0) : 0

		const value = dtrValue | rtsValue

		const result = await this.#requestOut(REQUESTS.SET_MODEM_CTRL, value)
		if(result.status !== USB_TRANSFER_OK) { throw new Error('status not ok') }
	}

	async setEventChar(data: number, enable = true): Promise<void> {
		const ENABLE_BIT = 0x01_00

		const value = enable ? ENABLE_BIT | data : data

		const result = await this.#requestOut(REQUESTS.SET_EVENT_CHAR, value)
		if(result.status !== USB_TRANSFER_OK) { throw new Error('status not ok') }
	}

	async setErrorChar(data: number, enable = true): Promise<void> {
		const ENABLE_BIT = 0x01_00

		const value = enable ? ENABLE_BIT | data : data

		const result = await this.#requestOut(REQUESTS.SET_ERROR_CHAR, value)
		if(result.status !== USB_TRANSFER_OK) { throw new Error('status not ok') }

	}


  async sendData(data: BufferSource): Promise<number> {
    const result = await this.#device.transferOut(this.#endpointBulkOut, data)
		if(result.status !== USB_TRANSFER_OK) { throw new Error('failure sending data') }
		return result.bytesWritten
  }

	async readData(length: number): Promise<DataView<ArrayBuffer>> {
		const result = await this.#device.transferIn(this.#endpointBulkIn, length)
		if(result.status !== USB_TRANSFER_OK) { throw new Error('failure to read data') }
		if(result.data === undefined) { throw new Error('result data undefined') }
		assertDataViewNotShared(result.data)
		return result.data
	}
}
