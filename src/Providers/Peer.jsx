import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';

const PeerContext = createContext(null);

export const usePeer = () => {
    return useContext(PeerContext);
};

export const PeerProvider = (props) => {
    const peer = useMemo(() => new RTCPeerConnection(), []);
    const [remoteStream, setRemoteStream] = useState(null);

    const createOffer = async () => {
        try {
            const offer = await peer.createOffer();
            await peer.setLocalDescription(offer);
            return offer;
        } catch (error) {
            console.error('Failed to create offer:', error);
        }
    };

    const createAnswer = async (offer) => {
        try {
            await peer.setRemoteDescription(new RTCSessionDescription(offer));
            const answer = await peer.createAnswer();
            await peer.setLocalDescription(answer);
            return answer;
        } catch (error) {
            console.error('Failed to create answer:', error);
        }
    };

    const setRemoteAnswer = async (ans) => {
        try {
            if (peer.signalingState === 'stable') {
                console.warn('Peer connection is in stable state. Cannot set remote description.');
                return;
            }
            console.log('Setting remote answer:', ans);
            await peer.setRemoteDescription(new RTCSessionDescription(ans));
        } catch (error) {
            console.error('Failed to set remote answer:', error);
        }
    };

    const sendStream = async (stream) => {
        const tracks = stream.getTracks();
        for (const track of tracks) {
            peer.addTrack(track, stream);
        }
    };

    const handleTrackEvent = useCallback((ev) => {
        const streams = ev.streams;
        setRemoteStream(streams[0]);
    }, []);

    useEffect(() => {
        peer.addEventListener('track', handleTrackEvent);
        
        // Add ICE and signaling state change listeners
        peer.addEventListener('iceconnectionstatechange', () => {
            console.log('ICE Connection State:', peer.iceConnectionState);
        });
        
        peer.addEventListener('signalingstatechange', () => {
            console.log('Signaling State:', peer.signalingState);
        });

        return () => {
            peer.removeEventListener('track', handleTrackEvent);
            peer.removeEventListener('iceconnectionstatechange', () => {
                console.log('ICE Connection State:', peer.iceConnectionState);
            });
            peer.removeEventListener('signalingstatechange', () => {
                console.log('Signaling State:', peer.signalingState);
            });
        };
    }, [handleTrackEvent, peer]);

    return (
        <PeerContext.Provider value={{ peer, createOffer, createAnswer, setRemoteAnswer, sendStream, remoteStream }}>
            {props.children}
        </PeerContext.Provider>
    );
};
