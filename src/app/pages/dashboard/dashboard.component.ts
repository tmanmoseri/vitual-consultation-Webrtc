import { AfterViewInit, Component, ElementRef, ViewChild } from '@angular/core';
import { DataService } from '../service/data.service';
import { Message } from '../types/message';


const mediaConstraints = {
  audio: true,
  video: {width: 250, height: 250}
}

const offerOptions = {
  offerToReceiveAudio: true,
  offerToReceiveVideo: true
};


@Component({
  selector: 'app-dashboard',
  templateUrl: './dashboard.component.html',
  styleUrls: ['./dashboard.component.scss']
})

export class DashboardComponent implements AfterViewInit {
  
  @ViewChild('local_video') localVideo!: ElementRef;
  @ViewChild('received_video') remoteVideo!: ElementRef;
  
 //Contains all required info of the remote party
  private peerConnection!: RTCPeerConnection;

  private localStream!: MediaStream;


  inCall = false;
  localVideoActive = false;

  
  constructor(private dataService: DataService) { }


  //Function call to the remote party
  async call(): Promise<void> {
    this.createPeerConnection();

    // Add the tracks from the local stream to the RTCPeerConnection
    this.localStream.getTracks().forEach(
      track => this.peerConnection.addTrack(track, this.localStream)
    );

    try {
      const offer: RTCSessionDescriptionInit = await this.peerConnection.createOffer(offerOptions);
      // Establish the offer as the local peer's current description.
      await this.peerConnection.setLocalDescription(offer);

      //this.inCall = true;
      
      //Send offer to the webSocket
      this.dataService.sendMessage({type: 'offer', data: offer});
    } catch (err) {
      this.handleGetUserMediaError(err as Error);
    }
  }

  hangUp(): void {
    this.dataService.sendMessage({type: 'hangup', data: ''});
    this.closeVideoCall();
  }


  ngAfterViewInit(): void {

    this.addIncomingMessageHandler();
    //Request access to media devices
    this.requestMediaDevices();
  }

  private async requestMediaDevices(): Promise<void> {
    //Get user media from media devices using navigator fro media constraints
    this.localStream = await navigator.mediaDevices.getUserMedia(mediaConstraints);

    //call a pause function after opening the localStream
    this.pauseLocalVideo();

    //attach camera to local video element
    this.localVideo.nativeElement.srcObject = this.localStream;
  }

  startLocalVideo(): void {
    console.log('starting local stream');
    //starting all tracks and attaching the video to the localStream
    this.localStream.getTracks().forEach(track => {
      track.enabled = true;
    });
     //attaching localStream to the video element
    this.localVideo.nativeElement.srcObject = this.localStream;

    this.localVideoActive = true;
    
  }

  // function to pause the video
  pauseLocalVideo(): void {
    console.log('pause local stream');

    //this pause the stream
    this.localStream.getTracks().forEach(track => {
      track.enabled = false;
    });
    //detaching localStream from the video
    this.localVideo.nativeElement.srcObject = undefined;

    this.localVideoActive = false;
  }

  

  //creating a peer connection
  private createPeerConnection(): void {
    console.log('creating PeerConnection...');

    this.peerConnection = new RTCPeerConnection( { 
      iceServers: [
          {
            urls: 'stun:stun1.l.google.com:19302'
          }
        ]
      });
    //defining event handlers
    this.peerConnection.onicecandidate = this.handleICECandidateEvent;
    this.peerConnection.oniceconnectionstatechange = this.handleICEConnectionStateChangeEvent;
    this.peerConnection.onsignalingstatechange = this.handleSignalingStateChangeEvent;
    this.peerConnection.ontrack = this.handleTrackEvent;
  }

  private closeVideoCall(): void {
    console.log('Closing call');

    if (this.peerConnection) {
      console.log('--> Closing the peer connection');
      
      //resetting all event handlers by null
      this.peerConnection.ontrack = null;
      this.peerConnection.onicecandidate = null;
      this.peerConnection.oniceconnectionstatechange = null;
      this.peerConnection.onsignalingstatechange = null;

      // Stopping all transceivers on the connection
      this.peerConnection.getTransceivers().forEach(transceiver => {
        transceiver.stop();
      });

      // Close the peer connection
      this.peerConnection.close();
      //this.peerConnection = null;

      this.inCall = false;
    }
  }

    /* ########################  ERROR HANDLER  ################################## */
    private handleGetUserMediaError(e: Error): void {
      switch (e.name) {
        case 'NotFoundError':
          alert('Unable to open your call because no camera and/or microphone were found.');
          break;
        case 'SecurityError':
        case 'PermissionDeniedError':
          // Do nothing; this is the same as the user canceling the call.
          break;
        default:
          console.log(e);
          alert('Error opening your camera and/or microphone: ' + e.message);
          break;
      }
  
      this.closeVideoCall();
    }
    private reportError = (e: Error) => {
      console.log('got Error: ' + e.name);
      console.log(e);
    }

    /* ########################  EVENT HANDLERS  ################################## */
  private handleICECandidateEvent = (event: RTCPeerConnectionIceEvent) => {
    console.log(event);
    if (event.candidate) {
      this.dataService.sendMessage({
        type: 'ice-candidate',
        data: event.candidate
      });
    }
  }

  private handleICEConnectionStateChangeEvent = (event: Event) => {
    console.log(event);
    switch (this.peerConnection.iceConnectionState) {
      case 'closed':
      case 'failed':
      case 'disconnected':
        this.closeVideoCall();
        break;
    }
  }

  private handleSignalingStateChangeEvent = (event: Event) => {
    console.log(event);
    switch (this.peerConnection.signalingState) {
      case 'closed':
        this.closeVideoCall();
        break;
    }
  }

  private handleTrackEvent = (event: RTCTrackEvent) => {
    console.log(event);
    this.remoteVideo.nativeElement.srcObject = event.streams[0];
  }







  //handle messages from the signal server send by remote
  private addIncomingMessageHandler(): void {
    this.dataService.connect();

    // this.transactions$.subscribe();
    this.dataService.messages$.subscribe(
      msg => {
        // console.log('Received message: ' + msg.type);
        switch (msg.type) {
          case 'offer':
            this.handleOfferMessage(msg.data);
            break;
          case 'answer':
            this.handleAnswerMessage(msg.data);
            break;
          case 'hangup':
            this.handleHangupMessage(msg);
            break;
          case 'ice-candidate':
            this.handleICECandidateMessage(msg.data);
            break;
          default:
            console.log('unknown message of type ' + msg.type);
        }
      },
      error => console.log(error)
    );
  }

    /* ########################  MESSAGE HANDLER  ################################## */

    private handleOfferMessage(msg: RTCSessionDescriptionInit): void {
      console.log('handle incoming offer');
      if (!this.peerConnection) {
        this.createPeerConnection();
      }
  
      if (!this.localStream) {
        this.startLocalVideo();
      }
  
      this.peerConnection.setRemoteDescription(new RTCSessionDescription(msg))
        .then(() => {
  
          // add media stream to local video
          this.localVideo.nativeElement.srcObject = this.localStream;
  
          // add media tracks to remote connection
          this.localStream.getTracks().forEach(
            track => this.peerConnection.addTrack(track, this.localStream)
          );
  
        }).then(() => {
  
        // Build SDP for answer message
        return this.peerConnection.createAnswer();
  
      }).then((answer) => {
  
        // Set local SDP
        return this.peerConnection.setLocalDescription(answer);
  
      }).then(() => {
  
        // Send local SDP to remote party
        this.dataService.sendMessage({type: 'answer', data: this.peerConnection.localDescription});
  
        this.inCall = true;
  
      }).catch(this.handleGetUserMediaError);
    }
  
    private handleAnswerMessage(msg: RTCSessionDescriptionInit): void {
      console.log('handle incoming answer');
      this.peerConnection.setRemoteDescription(msg);
    }
  
    private handleHangupMessage(msg: Message): void {
      console.log(msg);
      this.closeVideoCall();
    }
  
    private handleICECandidateMessage(msg: RTCIceCandidate): void {
      const candidate = new RTCIceCandidate(msg);
      this.peerConnection.addIceCandidate(candidate).catch(this.reportError);
    }

}
