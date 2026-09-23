
export const STATUS_PREFIX_LENGTH = 2

export const MODEM_STATUS_CLEAR_TO_SEND = 0x10
export const MODEM_STATUS_DATA_SET_READY = 0x20
export const MODEM_STATUS_RING_INDICATOR = 0x40
export const MODEM_STATUS_DATA_CARRIER_DETECT = 0x80



export const LINE_STATUS_OVERRUN_ERROR = 0x01
export const LINE_STATUS_PARITY_ERROR = 0x02
export const LINE_STATUS_FRAMING_ERROR = 0x04
export const LINE_STATUS_BREAK_INTERRUPT = 0x08
export const LINE_STATUS_TX_HOLDING_EMPTY = 0x10
export const LINE_STATUS_TX_EMPTY = 0x20
export const LINE_STATUS_RECEIVER_ERROR = 0x40


export interface DeviceModemStatus {
	data: number
	isClearToSend: boolean
	isDataReady: boolean
	isRing: boolean
	isCarrierDetect: boolean
}

export interface DeviceLineStatus {
	data: number
	isOverrunError: boolean
	isParityError: boolean
	isFramingError: boolean
	isInterrupt: boolean
	isTXHoldingEmpty: boolean
	isTXEmpty: boolean
	isReceiverError: boolean
}

export interface DeviceStatusInfo {
	modem: DeviceModemStatus,
	line: DeviceLineStatus
}


export class DeviceStatus {
	static parse(data: BufferSource): DeviceStatusInfo|undefined {
		const u8 = ArrayBuffer.isView(data) ?
			new Uint8Array(data.buffer, data.byteOffset, STATUS_PREFIX_LENGTH) :
			new Uint16Array(data, 0, STATUS_PREFIX_LENGTH)

		const [ modemStatus, lineStatus ] = u8

		if(modemStatus === undefined) { return undefined }
		if(lineStatus === undefined) { return undefined }

		//
		const isClearToSend = (modemStatus & MODEM_STATUS_CLEAR_TO_SEND) !== 0
		const isDataReady = (modemStatus & MODEM_STATUS_DATA_SET_READY) !== 0
		const isRing = (modemStatus & MODEM_STATUS_RING_INDICATOR) !== 0
		const isCarrierDetect = (modemStatus & MODEM_STATUS_DATA_CARRIER_DETECT) !== 0

		//
		const isOverrunError = (lineStatus & LINE_STATUS_OVERRUN_ERROR) !== 0
		const isParityError = (lineStatus & LINE_STATUS_PARITY_ERROR) !== 0
		const isFramingError = (lineStatus & LINE_STATUS_FRAMING_ERROR) !== 0
		const isInterrupt = (lineStatus & LINE_STATUS_BREAK_INTERRUPT) !== 0
		const isTXHoldingEmpty = (lineStatus & LINE_STATUS_TX_HOLDING_EMPTY) !== 0
		const isTXEmpty = (lineStatus & LINE_STATUS_TX_EMPTY) !== 0
		const isReceiverError = (lineStatus & LINE_STATUS_RECEIVER_ERROR) !== 0

		return {
			modem: {
				data: modemStatus,
				isClearToSend,
				isDataReady,
				isRing,
				isCarrierDetect,
			},
			line: {
				data: lineStatus,
				isOverrunError,
				isParityError,
				isFramingError,
				isInterrupt,
				isTXHoldingEmpty,
				isTXEmpty,
				isReceiverError
			}
		}
	}
}
