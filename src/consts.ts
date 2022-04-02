
const _MPSSE = {
  BITMODE_RESET: 0x00, // bitbang OFF / regular serial/FIFO
  BITMODE_BITBANG: 0x01, // async bitbang (classic)
  BITMODE_MPSSE: 0x02, // MPSSE mode
  BITMODE_SYNCBB: 0x04, // synchronous bitbang
  BITMODE_MCU: 0x08, // MCU Host Bus Emulation
  BITMODE_OPTO: 0x10, // Opto-Isolated Serial Interface Mode
  BITMODE_CBUS: 0x20, // Bitbang on CBUS
  BITMODE_SYNCFF: 0x40, // Single Channel Synchronous FIFO mode,
  BITMODE_FT1284: 0x80, // FT1284
}


const MSB_FIRST_CLOCK_COMMANDS = {
	OUT_BYTES_POSITIVE_VE: 0x10, // write
	OUT_BYTES_NEGATIVE_VE: 0x11,
	OUT_BITS_POSITIVE_VE: 0x12,
	OUT_BITS_NEGATIVE_VE: 0x13,

	IN_BYTES_POSITIVE_VE: 0x20, // read
	IN_BYTES_NEGATIVE_VE: 0x24,
	IN_BITS_POSTIVE_VE: 0x22,
	IN_BITS_NEGATIVE_VE: 0x26,

	IN_OUT_BYTES_OUT_NEGATIVE_IN_POSITIVE_VE: 0x31,
	IN_OUT_BYTES_OUT_POSITIVE_IN_NEGATIVE_VE: 0x34,
	IN_OUT_BITS_OUT_NEGATIVE_IN_POSITIVE_VE: 0x33,
	IN_OUT_BITS_OUT_POSTIVE_IN_NEGATIVE_VE: 0x36,
}

const LSB_FIRST_CLOCK_COMMANDS = {
	OUT_BYTES_POSITIVE_VE: 0x18,
	OUT_BYTES_NEGATIVE_VE: 0x19,
	OUT_BITS_POSITIVE_VE: 0x1A,
	OUT_BITS_NEGATIVE_VE: 0x1B,

	IN_BYTES_POSITIVE_VE: 0x28,
	IN_BYTES_NEGATIVE_VE: 0x2C,
	IN_BITS_POSTIVE_VE: 0x2A,
	IN_BITS_NEGATIVE_VE: 0x2E,

	IN_OUT_BYTES_OUT_NEGATIVE_IN_POSITIVE_VE: 0x39,
	IN_OUT_BYTES_OUT_POSITIVE_IN_NEGATIVE_VE: 0x3C,
	IN_OUT_BITS_OUT_NEGATIVE_IN_POSITIVE_VE: 0x3B,
	IN_OUT_BITS_OUT_POSTIVE_IN_NEGATIVE_VE: 0x3E,
}

const LSB_FIRST_TMS_COMMANDS = {
	CLOCK_DATA_NO_READ_POSITIVE_VE: 0x4A,
	CLOCK_DATA_NO_READ_NEGATIVE_VE: 0x4B,

	CLOCK_DATA_WITH_READ_ON_POSITIVE_VE_READ_POSITIVE_VE: 0x6A,
	CLOCK_DATA_WITH_READ_ON_NEGATIVE_VE_READ_POSITIVE_VE: 0x6B,
	CLOCK_DATA_WITH_READ_ON_POSITIVE_VE_READ_NEGATIVE_VE: 0x6E,
	CLOCK_DATA_WITH_READ_ON_NEGATIVE_VE_READ_NETATIVE_VE: 0x6F
}

const PIN_STATE_COMMANDS = {
	SET_DATA_BITS_LOW_BYTE: 0x80,
	SET_DATA_BITS_HIGH_BYTE: 0x82,

	READ_DATA_BITS_LOW_BYTE: 0x81,
	READ_DATA_BITS_HIGH_BYTE: 0x83
}

const LOOPBACK_COMMANDS = {
	ENABLED: 0x84,
	DISABLEL: 0x85
}

const CLOCK_DIVISOR_COMMANDS = {
	SET_TCK_SK_DIVISOR: 0x86,
	SET_CLK_DIVISOR: 0x86
}

const HOST_EMULATION_MODE_COMMANDS = {
	READ_SHORT_ADDRESS: 0x90,
	READ_EXTENDED_ADDRESS: 0x91,
	WRITE_SHORT_ADDRESS: 0x92,
	WRITE_EXTENDED_ADDRESS: 0x93
}

const HOST_AND_MPSEE_MODE_COMMANDS = {
	SEND_IMMEDIATE: 0x87,
	WAIT_IO_HIGH: 0x88,
	WAIT_IO_LOW: 0x89
}

const H_COMMANDS = {
	DISABLE_CLOCK_DIVIDE_BY_FIVE: 0x8A,
	ENABLE_CLOCK_DIVIDE_BY_FIVE: 0x8B,

	ENABLE_THREE_PHASE_CLOCKING: 0x8C,
	DISABLE_THREE_PHASE_CLOCKING: 0x8D,

	CLOCK_N_BITS_NO_TRANSFER: 0x8E,
	CLOCK_N_EIGHT_BITS_NO_TRANSFER: 0x8F,

	CLOCK_WAIT_IO_HIGH: 0x94,
	CLOCK_WAIT_IO_LOW: 0x95,

	ENABLE_ADAPTIVE_CLOCKING: 0x96,
	DISABLE_ADAPTIVE_CLOCKING: 0x97,

	CLOCK_N_BITS_NO_TRANSFER_OR_UNTIL_HIGH: 0x9C,
	CLOCK_N_EIGHT_BITS_NO_TRANSFER_OR_UNTIL_LOW: 0x9D
}

const FT232H_ONLY_COMMANDS = {
	SET_IO_ONLY_DRIVE_LOW: 0x9E
}



const _COMMANDS = {
  // Shifting commands IN MPSSE Mode
	MPSSE_WRITE_NEG: 0x01, // Write TDI/DO on negative TCK/SK edg
	MPSSE_BITMODE:   0x02, // Write bits, not bytes
	MPSSE_READ_NEG:  0x04, // Sample TDO/DI on negative TCK/SK edge
	MPSSE_LSB:       0x08, // LSB first
	// MPSSE_DO_WRITE:  0x10, // Write TDI/DO
	// MPSSE_DO_READ:   0x20, // Read TDO/DI
	MPSSE_WRITE_TMS: 0x40, // Write TMS/CS

	// FTDI MPSSE commands
	// SET_BITS_LOW:   0x80,
	// SET_BITS_HIGH:  0x82,

	// GET_BITS_LOW:   0x81,
	// GET_BITS_HIGH:  0x83,

	// LOOPBACK_START: 0x84,
	// LOOPBACK_END:   0x85,
	// TCK_DIVISOR:    0x86,

	// H Type specific commands
	// DIS_DIV_5:       0x8a,
	// EN_DIV_5:        0x8b,
	// EN_3_PHASE:      0x8c,
	// DIS_3_PHASE:     0x8d,
	// CLK_BITS:        0x8e,
	// CLK_BYTES:       0x8f,
	// CLK_WAIT_HIGH:   0x94,
	// CLK_WAIT_LOW:    0x95,
	// EN_ADAPTIVE:     0x96,
	// DIS_ADAPTIVE:    0x97,
	// CLK_BYTES_OR_HIGH: 0x9c,
	// CLK_BYTES_OR_LOW:  0x9d,

	// FT232H specific commands
	// DRIVE_OPEN_COLLECTOR: 0x9e,

	// Commands in MPSSE and Host Emulation Mode
	// SEND_IMMEDIATE: 0x87,
	// WAIT_ON_HIGH:   0x88,
	// WAIT_ON_LOW:    0x89,

	// Commands in Host Emulation Mode
	// READ_SHORT:     0x90,
	// READ_EXTENDED:  0x91,
	// WRITE_SHORT:    0x92,
	// WRITE_EXTENDED: 0x93,
}

const _REQUESTS = {
	RESET: 0,
	SET_MODEM_CTRL: 1,
	SET_FLOW_CTRL: 2,
	SET_BAUDRATE: 3,
	SET_DATA: 4,
	POLL_MODEM_STATUS: 0x05,
	SET_EVENT_CHAR: 0x06,
	SET_ERROR_CHAR: 0x07,
	SET_LATENCY_TIMER: 0x09,
	GET_LATENCY_TIMER: 0x0A,
	SET_BITMODE: 0x0B,
	READ_PINS: 0x0C,
	READ_EEPROM: 0x90,
	WRITE_EEPROM: 0x91,
	ERASE_EEPROM: 0x92,
}