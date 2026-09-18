import type { BitMode } from './consts.ts'
import { REQUESTS } from './consts.ts'

function assertDataViewNotShared(view: DataView): asserts view is DataView & { buffer: ArrayBuffer } {
	if (typeof SharedArrayBuffer !== 'undefined' && view.buffer instanceof SharedArrayBuffer) {
		throw new TypeError('DataView cannot be backed by a SharedArrayBuffer')
	}
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
