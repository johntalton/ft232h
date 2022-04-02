
export const CLOCK_WIDTH_BITS = 'bits'
export const CLOCK_WIDTH_BYTES = 'bits'

export const CLOCK_EDGE_POSITIVE = 'postive'
export const CLOCK_EDGE_NEGATIVE = 'negative'

export type CLOCK_WIDTH = 'bits' | 'bytes'
export type CLOCK_EDGE = 'positive' | 'negative'


export type COMMAND = {
	command: number
}



export type CLOCK_COMMAND = COMMAND | {
	width: CLOCK_WIDTH,
	lsb: boolean,
}

export type CLOCK_EDGE_COMMAND = CLOCK_COMMAND | {
	edge: CLOCK_EDGE
}

export type CLOCK_OUT_COMMAND = CLOCK_EDGE_COMMAND | {
	length: number,
	buffer: ArrayBuffer
}

export type CLOCK_IN_COMMAND = CLOCK_EDGE_COMMAND | {
	length: number
}

export type CLOCK_IN_OUT_COMMAND = CLOCK_COMMAND | {
	edges: 'out-negative-in-positive' | 'out-positive-in-negative'
}



export type PIN_BANK_COMMAND = COMMAND | {
	bank: 'high' | 'low'
}

export type PIN_STATE_SET_COMMAND = PIN_BANK_COMMAND | {
	value: number,
	direction: number
}

export type PIN_STATE_READ_COMMAND = PIN_BANK_COMMAND | {

}




export type LOOPBACK_COMMAND = COMMAND | {
	enable: boolean
}

export type CLOCK_DIVIDER_COMMAND = COMMAND | {
	value: number
	// styles
}



export type ADDRESS_COMMAND = COMMAND | {
	address: number,
	extended: boolean
}

export type READ_ADDRESS_COMMAND = ADDRESS_COMMAND | {

}

export type WRITE_ADDRESS_COMMAND = ADDRESS_COMMAND | {
	buffer: ArrayBuffer
}



export type SEND_IMMEDIATE_COMMAND = COMMAND | {

}


export type WAIT_IO_COMMAND = COMMAND | {
	on: 'high' | 'low'
}



export type DIVIDE_BY_FIVE_COMMAND = COMMAND | {
	enabled: boolean
}

export type THREE_PHASE_COMMAND = COMMAND | {
	enabled: boolean
}

export type ADAPTIVE_CLOCKING_COMMAND = COMMAND | {
	enabled: boolean
}


export type CLOCK_AND_WAIT_IO_COMMAND = COMMAND | {
	on: 'high' | 'low'
}


export type CLOCK_N_NO_TRANSFER = COMMAND | {
	width: CLOCK_WIDTH,
	length: number
}

export type CLOCK_N_NO_TRANSFER_OR_UNTIL = COMMAND | {
	width: CLOCK_WIDTH,
	length: number,
	on: 'high' | 'low'
}


export type ONLY_DRIVE_LOW_COMMAND = COMMAND | {
	//?
}

