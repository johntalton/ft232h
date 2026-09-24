/** biome-ignore-all lint/performance/noAwaitInLoops: <explanation> */
import type { FT232H } from "./ft232h.ts"
import { STATUS_PREFIX_LENGTH } from "./status.ts"



export const DEFAULT_DATA_READ_SIZE = 64
export const DEFAULT_MAX_POLL_ATTEMPTS = 5

export class Util {
	static async pollData(device: FT232H, attempts = DEFAULT_MAX_POLL_ATTEMPTS): Promise<Uint8Array<ArrayBuffer>> {
		for(let i = 0; i < attempts; i += 1) {
			const response = await device.readData(DEFAULT_DATA_READ_SIZE)
			if(response.byteLength === STATUS_PREFIX_LENGTH) { continue }
			if(response === undefined) { throw new Error('no response') }
			// const status = DeviceStatus.parse(response)
			// console.log('attempts', i)
			return new Uint8Array(response.buffer, STATUS_PREFIX_LENGTH)
		}

		throw new Error('no valid data acquired')
	}
}
