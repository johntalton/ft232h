
export async function sendRecvCommand(port, command, sendBuffer, recvLength) {
  console.log('reader state', port.readable.locked, command, sendBuffer, recvLength)
  if(port.readable.locked) { console.warn('locked reader ...') }

  const defaultWriter = port.writable.getWriter()
  const defaultReader = port.readable.getReader()

  try {
    //
    //console.log('write encoded command', command)
    await defaultWriter.ready

    if(sendBuffer) {
      //console.log('sending buffer', Uint8Array.from([ command, ...sendBuffer ]))
      await defaultWriter.write(Uint8Array.from([ command, ...sendBuffer ]))
    }
    else {
      await defaultWriter.write(Uint8Array.from([ command ]))
    }

    //
    //console.log('close writer')
    await defaultWriter.ready
    await defaultWriter.close()

    // console.log({ recvLength })
    if(recvLength <= 0) {
      //console.log('expect zero')
      //const trash = await defaultReader.read()
      // console.log('trash', trash)
      return Uint8Array.from([])
    }

    const chunkRead = async (prevSize, { value, done }) => {
      if(done) {
         console.log('exit read on done')
        return value
      }

      const readSize = prevSize + value.byteLength
      if(readSize >= recvLength) {
         console.log('exit read on size')
        return value
      }

       console.log('reading chunk:', done, readSize)
      return Uint8Array.from([ ...value, ...await chunkRead(readSize, await defaultReader.read()) ])
    }

    const firstRead = await defaultReader.read()
     console.log('first chunk read', firstRead)
    return await chunkRead(0, firstRead)
  }
  catch(e) {
    console.warn(e)
    return Uint8Array.from([])
  }
  finally {
    //defaultReader.releaseLock()
    await defaultReader.cancel()

    defaultWriter.releaseLock()
  }
}