/** biome-ignore-all lint/style/useConsistentArrayType: <explanation> */
import type { FT232H } from '../ft232h.ts'
import { MPSSETemplate } from './mpsse-template.ts'

export class MPSSE {
	readonly #device: FT232H

	constructor(device: FT232H) {
		this.#device = device
	}

	async executeCommands(commands: Array<number>|number): Promise<void> {
		const cmdList = Array.isArray(commands) ? commands : [ commands ]
		const flatCmdList = cmdList.flat()
		await this.#device.sendData(Uint8Array.from(flatCmdList))
	}


	async setGpioHigh(pins: number, directions: number): Promise<void> {
		const command = MPSSETemplate.gpioSetHigh(pins, directions)
		return this.executeCommands(command)
	}

	async setGpioLow(pins: number, directions: number): Promise<void> {
		const command = MPSSETemplate.gpioSetLow(pins, directions)
		return this.executeCommands(command)
	}

	async getGpioHigh(): Promise<void> {
		const command = MPSSETemplate.gpioGetHigh()
		return this.executeCommands(command)
	}

	async getGpioLow(): Promise<void> {
		const command = MPSSETemplate.gpioGetLow()
		return this.executeCommands(command)
	}


	async setClockDivisor(divider: number): Promise<void> {
		const command = MPSSETemplate.setClockDivisor(divider)
		return this.executeCommands(command)
	}

	// async waitIOHigh(): Promise<void> {s

	// async waitIOLow(): Promise<void> {
	// }

	async enableClockDivideBy5(enable = true): Promise<void> {
		const command = MPSSETemplate.enableClockDivideBy5(enable)
		return this.executeCommands(command)
	}

	async enableThreePhaseClocking(enable = true): Promise<void> {
		const command = MPSSETemplate.enableThreePhaseClocking(enable)
		return this.executeCommands(command)
	}

	// async clcokWaitIOHigh(): Promise<void> {
	// }

	// async clockWaitIOLow(): Promise<void> {
	// }

	async enableAdaptiveClocking(enable = true): Promise<void> {
		const command = MPSSETemplate.enableAdaptiveClocking(enable)
		return this.executeCommands(command)
	}

	// async clockBitsNoTransferOrUntilHigh(): Promise<void> {
	// }

	// async clockByteNoTransferOrUntilLow(): Promise<void> {
	// }

	async setDriveOnlyZero(pinsLow: number, pinsHigh: number): Promise<void> {
		const command = MPSSETemplate.setDriveOnlyZero(pinsLow, pinsHigh)
		return this.executeCommands(command)
	}
}


