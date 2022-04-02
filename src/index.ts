import { I2CAddressedBus } from '@johntalton/and-other-delights'
import { sendRecvCommand } from './transfer.js'

export class FT232HCommon {

	static async usbReset(device: USBDevice) {
		await device.controlTransferIn({
			requestType: 'vendor',
			recipient: 'device',
			request: 0,
			value: 0,
			index: 0
		})
	}

	static async tciFlush(device: USBDevice) {
		await device.controlTransferIn({
			requestType: 'vendor',
			recipient: 'device',
			request: 0,
			value: 2,
			index: 0
		})
	}

	static async tcoFlush(device: USBDevice) {
		await device.controlTransferIn({
			requestType: 'vendor',
			recipient: 'device',
			request: 0,
			value: 1,
			index: 0
		})
	}

	static async setBaudrate(device: USBDevice, value: number) {
		await device.controlTransferIn({
			requestType: 'vendor',
			recipient: 'device',
			request: 3,
			value,
			index: 0
		})
	}

	static async setLineProperty() {}

	static async writeData(device: USBDevice, bufferSource: BufferSource) {
		await device.transferOut(ep, bufferSource)
	}
	static async readData(device: USBDevice) {
		await device.transferIn(ep, length)
	}

	static async setBitmode(device: USBDevice, value: number) {
		await device.controlTransferIn({
			requestType: 'vendor',
			recipient: 'device',
			request: 0x0b,
			value,
			index: 0
		})
	}
	static async disableBitbang() {
		throw new Error('no impl')
	}

	static async readPins() {
		throw new Error('no impl')
	}

	static async setLatencyTimer() {
		throw new Error('no impl')
	}
	static async getLatencyTimer() {
		throw new Error('no impl')
	}

	static async pollModemStatus() {
		throw new Error('no impl')
	}

	static async setFlowControl() {
		throw new Error('no impl')
	}
	static async setFlowControlXONXOFF() {
		throw new Error('no impl')
	}

	static async setDTR() {
		throw new Error('no impl')
	}
	static async setRTS() {
		throw new Error('no impl')
	}

	static async setDTRRTS() {
		throw new Error('no impl')
	}

	static async setEventChar() {
		throw new Error('no impl')
	}
	static async setErrorChar() {
		throw new Error('no impl')
	}

}