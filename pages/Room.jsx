import React, { useCallback, useEffect, useState } from 'react'
import { useSocket } from '../src/Providers/Socket'
import { usePeer } from '../src/Providers/Peer'
import ReactPlayer from 'react-player'

const Room = () => {
    const socket = useSocket()
    const { peer, createOffer, createAnswer, setRemoteAnswer, sendStream, remoteStream } = usePeer()
    const [myStream, setMyStream] = useState(null)
    const [remoteEmailId, setRemoteEmailId] = useState(null)

    const handleNewUserJoinRoom = useCallback(async (data) => {
        const { emailId } = data
        console.log(emailId, 'new user successfully joined')
        const offer = await createOffer()
        socket.emit("call-user", { emailId, offer })
        setRemoteEmailId(emailId)
    }, [createOffer, socket])

    const handleIncomingCall = useCallback(async (data) => {
        const { from, offer } = data
        console.log('incoming-call', from, offer)
        const ans = await createAnswer(offer)
        socket.emit("call-accepted", { emailId: from, ans })
        setRemoteEmailId(from)
    }, [createAnswer, socket])

    const handleCallAccepted = useCallback(async (data) => {
        const { ans } = data
        console.log('call got accepted', ans)
        await setRemoteAnswer(ans)
    }, [setRemoteAnswer])

    const getUserMediaStream = useCallback(async () => {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({
                video: true,
                audio: true,
            })
            setMyStream(stream)
            stream.getTracks().forEach(track => peer.addTrack(track, stream))
        } catch (error) {
            console.error('Error accessing media devices:', error)
        }
    }, [peer])

    const handleNegotiation = useCallback(async () => {
        try {
            const offer = await peer.createOffer()
            await peer.setLocalDescription(offer)
            socket.emit('call-user', { emailId: remoteEmailId, offer })
        } catch (error) {
            console.error('Error during negotiation:', error)
        }
    }, [peer, remoteEmailId, socket])

    useEffect(() => {
        socket.on("user-joined", handleNewUserJoinRoom)
        socket.on("incomming-call", handleIncomingCall)
        socket.on("call-accepted", handleCallAccepted)
        return () => {
            socket.off('user-joined', handleNewUserJoinRoom)
            socket.off('incomming-call', handleIncomingCall)
            socket.off("call-accepted", handleCallAccepted)
        }
    }, [handleNewUserJoinRoom, socket, handleIncomingCall, handleCallAccepted])

    useEffect(() => {
        peer.addEventListener('negotiationneeded', handleNegotiation)
        return () => {
            peer.removeEventListener('negotiationneeded', handleNegotiation)
        }
    }, [peer, handleNegotiation])

    useEffect(() => {
        getUserMediaStream()
    }, [getUserMediaStream])

    return (
        <>
            <div>Room</div>
            <h4>You are connected to {remoteEmailId}</h4>
            <ReactPlayer url={myStream} playing muted />
            <ReactPlayer url={remoteStream} playing />
        </>
    )
}

export default Room