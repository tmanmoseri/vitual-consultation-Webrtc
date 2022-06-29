import { Injectable } from '@angular/core';
import {Subject} from 'rxjs';
import {webSocket, WebSocketSubject} from 'rxjs/webSocket';
import {Message} from '../types/message';

//Websocket endpoint
//export const WS_ENDPOINT = environment.wsEndpoint;   // wsEndpoint: 'ws://localhost:8081'
export const WS_ENDPOINT ='ws://localhost:8081';

@Injectable({
  providedIn: 'root'
})
export class DataService {

  //Websocket subject of type message
  private socket$?: WebSocketSubject<any>;

  private messagesSubject = new Subject<Message>();

  //message observer to subscribe to for sending messages
  public messages$ = this.messagesSubject.asObservable();

  /**
   * Creates a new WebSocket subject and send it to the messages subject
   * @param cfg if true the observable will be retried.
   */
   public connect(): void {

    if (!this.socket$ || this.socket$.closed) {
      this.socket$ = this.getNewWebSocket();

      this.socket$.subscribe(
        // Called whenever there is a message from the server
        msg => {
          console.log('Received message of type: ' + msg.type);
          this.messagesSubject.next(msg);
        }
      );
    }
  }

//Method to send messages over the web service connection
  sendMessage(msg: Message): void {
    console.log('sending message: ' + msg.type);
    this.socket$?.next(msg);
  }

    /**
   * Return a custom WebSocket subject which reconnects after failure
   */
  private getNewWebSocket(): WebSocketSubject<any> {
    return webSocket({
      url: WS_ENDPOINT,
      openObserver: {
        next: () => {
          //Show success connection status
          console.log('[DataService]: connection ok');
        }
      },
      closeObserver: {
        next: () => {
           //Show closed connection status
          console.log('[DataService]: connection closed');
          //Resetting the socket
          this.socket$ = undefined;

          //Reconnect to webSockets incase the connection closes or gets lost
          this.connect();
        }
      }
    });
  }
  
}
