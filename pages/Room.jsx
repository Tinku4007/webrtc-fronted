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
        console.log('incomming-call', from, offer)
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
        const mediaFunction = {
            'video': true,
            'audio': true,
        }
        const stream = await navigator.mediaDevices.getUserMedia(mediaFunction)
        setMyStream(stream)
    }, [sendStream])


    const handleNegosiation = useCallback(() => {
        const localOffer = peer.localDescription;
        socket.emit('call-user' , {emailId:remoteEmailId , offer:localOffer})
        console.log("opps!")
    }, [peer.localDescription , remoteEmailId , socket])

    useEffect(() => {
        socket.on("user-joined", handleNewUserJoinRoom)
        socket.on("incomming-call", handleIncomingCall)
        socket.on("call-accepted", handleCallAccepted)
        return () => {
            socket.off('user-joined', handleNewUserJoinRoom)
            socket.off('incomming-call', handleIncomingCall)
            socket.on("call-accepted", handleCallAccepted)
        }
    }, [handleNewUserJoinRoom , socket , handleIncomingCall , handleNewUserJoinRoom])

    useEffect(() => {
        peer.addEventListener('negotiationneeded', handleNegosiation)
        return () => {
            peer.removeEventListener('negotiationneeded', handleNegosiation)
        }
    }, [peer , handleNegosiation])

    useEffect(() => {
        getUserMediaStream()
    }, [getUserMediaStream])

    return (
        <>
            <div>Room</div>
            <h4>you are connected to {remoteEmailId}</h4>
            <button onClick={e => sendStream(myStream)}>Send My Video</button>
            <ReactPlayer url={myStream} playing  />
            <ReactPlayer url={remoteStream} playing />
        </>
    )
}

export default Room