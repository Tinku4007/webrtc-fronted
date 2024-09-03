import React, { useCallback, useEffect, useState, useRef } from 'react'
import { useSocket } from '../src/Providers/Socket'
import { usePeer } from '../src/Providers/Peer'

const Room = () => {
    const socket = useSocket()
    const { peer, createOffer, createAnswer, setRemoteAnswer, sendStream, remoteStream } = usePeer()
    const [myStream, setMyStream] = useState(null)
    const [remoteEmailId, setRemoteEmailId] = useState(null)
    const [isConnected, setIsConnected] = useState(false)
    const localVideoRef = useRef(null)
    const remoteVideoRef = useRef(null)

    const handleNewUserJoinRoom = useCallback(async (data) => {
        const { emailId } = data
        console.log(`New user joined: ${emailId}`)
        setRemoteEmailId(emailId)
        const offer = await createOffer()
        socket.emit("call-user", { emailId, offer })
    }, [createOffer, socket])

    const handleIncomingCall = useCallback(async (data) => {
        const { from, offer } = data
        console.log(`Incoming call from: ${from}`)
        setRemoteEmailId(from)
        const ans = await createAnswer(offer)
        socket.emit("call-accepted", { emailId: from, ans })
    }, [createAnswer, socket])

    const handleCallAccepted = useCallback(async (data) => {
        const { ans } = data
        console.log('Call accepted, setting remote answer')
        await setRemoteAnswer(ans)
        setIsConnected(true)
    }, [setRemoteAnswer])

    const handleIceCandidate = useCallback((event) => {
        if (event.candidate) {
            console.log('Sending ICE candidate')
            socket.emit("ice-candidate", { emailId: remoteEmailId, candidate: event.candidate })
        }
    }, [socket, remoteEmailId])

    const handleTrackEvent = useCallback((event) => {
        console.log('Received remote track')
        if (remoteVideoRef.current && event.streams && event.streams[0]) {
            remoteVideoRef.current.srcObject = event.streams[0]
        }
    }, [])

    const getUserMediaStream = useCallback(async () => {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true })
            setMyStream(stream)
            if (localVideoRef.current) {
                localVideoRef.current.srcObject = stream
            }
            stream.getTracks().forEach(track => peer.addTrack(track, stream))
        } catch (error) {
            console.error('Error accessing media devices:', error)
        }
    }, [peer])

    useEffect(() => {
        getUserMediaStream()
    }, [getUserMediaStream])

    useEffect(() => {
        socket.on("user-joined", handleNewUserJoinRoom)
        socket.on("incoming-call", handleIncomingCall)
        socket.on("call-accepted", handleCallAccepted)

        peer.addEventListener('icecandidate', handleIceCandidate)
        peer.addEventListener('track', handleTrackEvent)

        return () => {
            socket.off('user-joined', handleNewUserJoinRoom)
            socket.off('incoming-call', handleIncomingCall)
            socket.off("call-accepted", handleCallAccepted)

            peer.removeEventListener('icecandidate', handleIceCandidate)
            peer.removeEventListener('track', handleTrackEvent)
        }
    }, [socket, peer, handleNewUserJoinRoom, handleIncomingCall, handleCallAccepted, handleIceCandidate, handleTrackEvent])


    useEffect(() => {
        const handleIceConnectionStateChange = () => {
            const state = peer.iceConnectionState;
            console.log('ICE connection state changed:', state);
            if (state === 'connected' || state === 'completed') {
                setIsConnected(true);
            } else {
                setIsConnected(false);
            }
        };
    
        peer.addEventListener('iceconnectionstatechange', handleIceConnectionStateChange);
    
        return () => {
            peer.removeEventListener('iceconnectionstatechange', handleIceConnectionStateChange);
        };
    }, [peer]);
    

    useEffect(() => {
        socket.on("ice-candidate", async (data) => {
            try {
                const { candidate } = data
                console.log('Received ICE candidate')
                await peer.addIceCandidate(new RTCIceCandidate(candidate))
            } catch (error) {
                console.error("Error adding received ICE candidate", error)
            }
        })

        return () => {
            socket.off("ice-candidate")
        }
    }, [socket, peer])

    return (
        <div>
            <h2>Room</h2>
            <p>Connection status: {isConnected ? 'Connected' : 'Connecting...'}</p>
            <p>Remote user: {remoteEmailId || 'None'}</p>
            <div>
                <h3>Local Video</h3>
                <video ref={localVideoRef} autoPlay playsInline muted />
            </div>
            <div>
                <h3>Remote Video</h3>
                <video ref={remoteVideoRef} autoPlay playsInline />
            </div>
        </div>
    )
}

export default Room