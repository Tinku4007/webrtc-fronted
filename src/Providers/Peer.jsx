import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';

const PeerContext = createContext(null);

export const usePeer = () => {
    return useContext(PeerContext);
};

export const PeerProvider = (props) => {
    const peer = useMemo(() => new RTCPeerConnection({
        iceServers: [
            { urls: 'stun:stun.l.google.com:19302' },
            { urls: 'stun:stun1.l.google.com:19302' },
            { urls: 'stun:stun2.l.google.com:19302' },
        ],
    }), []);
    const [remoteStream, setRemoteStream] = useState(null);

    const createOffer = async () => {
        try {
            const offer = await peer.createOffer();
            await peer.setLocalDescription(offer);
            return offer;
        } catch (error) {
            console.error('Failed to create offer:', error);
            throw error;
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
            throw error;
        }
    };

    const setRemoteAnswer = async (ans) => {
        try {
            await peer.setRemoteDescription(new RTCSessionDescription(ans));
        } catch (error) {
            console.error('Failed to set remote answer:', error);
            throw error;
        }
    };

    const handleTrackEvent = useCallback((ev) => {
        console.log('Track event received in PeerProvider', ev.streams);
        if (ev.streams && ev.streams[0]) {
            setRemoteStream(ev.streams[0]);
        }
    }, []);

    useEffect(() => {
        peer.addEventListener('track', handleTrackEvent);
        
        peer.addEventListener('iceconnectionstatechange', () => {
            console.log('ICE Connection State:', peer.iceConnectionState);
        });

        peer.addEventListener('signalingstatechange', () => {
            console.log('Signaling State:', peer.signalingState);
        });

        peer.addEventListener('connectionstatechange', () => {
            console.log('Connection State:', peer.connectionState);
            if (peer.connectionState === 'failed') {
                console.log('Connection failed. Attempting to restart ICE');
                peer.restartIce();
            }
        });

        return () => {
            peer.removeEventListener('track', handleTrackEvent);
            peer.removeEventListener('iceconnectionstatechange', () => {});
            peer.removeEventListener('signalingstatechange', () => {});
            peer.removeEventListener('connectionstatechange', () => {});
        };
    }, [handleTrackEvent, peer]);

    return (
        <PeerContext.Provider value={{ peer, createOffer, createAnswer, setRemoteAnswer, remoteStream }}>
            {props.children}
        </PeerContext.Provider>
    );
};