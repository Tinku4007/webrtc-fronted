import React, { useCallback, useEffect, useState, useRef } from 'react'
import { useSocket } from '../src/Providers/Socket'
import { usePeer } from '../src/Providers/Peer'
import ReactPlayer from 'react-player'

const Room = () => {
    const socket = useSocket()
    const { peer, createOffer, createAnswer, setRemoteAnswer, remoteStream } = usePeer()
    const [myStream, setMyStream] = useState(null)
    const [remoteEmailId, setRemoteEmailId] = useState(null)
    const [isConnected, setIsConnected] = useState(false)
    const remoteVideoRef = useRef(null)

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
        setIsConnected(true)
    }, [setRemoteAnswer])

    const getUserMediaStream = useCallback(async () => {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({
                video: true,
                audio: true,
            })
            setMyStream(stream)
            stream.getTracks().forEach(track => {
                const sender = peer.addTrack(track, stream)
                console.log('Added local track:', track.kind, sender)
            })
        } catch (error) {
            console.error('Error accessing media devices:', error)
            alert('Failed to access camera and microphone. Please check your permissions.')
        }
    }, [peer])

    const handleNegotiation = useCallback(async () => {
        try {
            console.log('Negotiation needed')
            const offer = await peer.createOffer()
            await peer.setLocalDescription(offer)
            socket.emit('call-user', { emailId: remoteEmailId, offer })
        } catch (error) {
            console.error('Error during negotiation:', error)
        }
    }, [peer, remoteEmailId, socket])

    const handleICECandidateEvent = useCallback((event) => {
        if (event.candidate) {
            console.log('Sending ICE candidate')
            socket.emit("ice-candidate", { candidate: event.candidate, to: remoteEmailId })
        }
    }, [socket, remoteEmailId])

    const handleNewICECandidate = useCallback(async (incoming) => {
        try {
            const candidate = new RTCIceCandidate(incoming.candidate)
            await peer.addIceCandidate(candidate)
            console.log('Added ICE candidate')
        } catch (error) {
            console.error('Error adding ICE candidate:', error)
        }
    }, [peer])

    const handleTrackEvent = useCallback((event) => {
        console.log('Received remote track', event.track.kind)
        if (remoteVideoRef.current && event.streams && event.streams[0]) {
            remoteVideoRef.current.srcObject = event.streams[0]
        }
    }, [])

    useEffect(() => {
        socket.on("user-joined", handleNewUserJoinRoom)
        socket.on("incomming-call", handleIncomingCall)
        socket.on("call-accepted", handleCallAccepted)
        socket.on("ice-candidate", handleNewICECandidate)

        peer.addEventListener('negotiationneeded', handleNegotiation)
        peer.addEventListener('icecandidate', handleICECandidateEvent)
        peer.addEventListener('track', handleTrackEvent)

        return () => {
            socket.off('user-joined', handleNewUserJoinRoom)
            socket.off('incomming-call', handleIncomingCall)
            socket.off("call-accepted", handleCallAccepted)
            socket.off("ice-candidate", handleNewICECandidate)

            peer.removeEventListener('negotiationneeded', handleNegotiation)
            peer.removeEventListener('icecandidate', handleICECandidateEvent)
            peer.removeEventListener('track', handleTrackEvent)
        }
    }, [handleNewUserJoinRoom, handleIncomingCall, handleCallAccepted, handleNewICECandidate, handleNegotiation, handleICECandidateEvent, handleTrackEvent, socket, peer])

    useEffect(() => {
        getUserMediaStream()
    }, [getUserMediaStream])

    return (
        <>
            <div>Room</div>
            <h4>You are connected to {remoteEmailId}</h4>
            <h4>Connection status: {isConnected ? 'Connected' : 'Connecting...'}</h4>
            {myStream && (
                <div>
                    <h5>My Video</h5>
                    <ReactPlayer url={myStream} playing muted width="300px" height="200px" />
                </div>
            )}
            <div>
                <h5>Remote Video</h5>
                <video ref={remoteVideoRef} autoPlay playsInline style={{ width: '300px', height: '200px' }} />
            </div>
            <button onClick={() => console.log('Remote Stream:', remoteVideoRef.current?.srcObject)}>
                Log Remote Stream
            </button>
        </>
    )
}

export default Room