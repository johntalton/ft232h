
const _REQUESTS = {
	RESET: 0,
	SET_MODEM_CTRL: 1,
	// SET_FLOW_CTRL: 2,
	// SET_BAUDRATE: 3,
	// SET_DATA: 4,
	POLL_MODEM_STATUS: 0x05,
	SET_EVENT_CHAR: 0x06,
	SET_ERROR_CHAR: 0x07,
	SET_LATENCY_TIMER: 0x09,
	GET_LATENCY_TIMER: 0x0A,
	SET_BITMODE: 0x0B,
	READ_PINS: 0x0C,
	// READ_EEPROM: 0x90,
	// WRITE_EEPROM: 0x91,
	// ERASE_EEPROM: 0x92,
} as const

export type RequestKeys = keyof typeof _REQUESTS
export type RequestType = number
export const REQUESTS: Record<RequestKeys, RequestType> = _REQUESTS


export type BitMode = number

// specified in 16bit-little-endian
export const BIT_MODE: Record<string, BitMode> = {
  RESET: 0x00_00, // bitbang OFF / regular serial/FIFO
  // BITBANG: 0x01, // async bitbang (classic)
  MPSSE: 0x02_00, // MPSSE mode
  // SYNCBB: 0x04, // synchronous bitbang
  // MCU: 0x08, // MCU Host Bus Emulation
  // OPTO: 0x10, // Opto-Isolated Serial Interface Mode
  // CBUS: 0x20, // Bitbang on CBUS
  // SYNCFF: 0x40, // Single Channel Synchronous FIFO mode,
  // FT1284: 0x80, // FT1284
}

export const RESET_USB = {
	RESET: 0,
	RX: 1,
	TX: 2
}

export interface ModemControl {
	DataTerminalReady?: boolean
	RequestToSend?: boolean
}
