
class UserObject {
    static instance: UserObject = new UserObject(); // singleton
    username: string;
    password: string;
    ws: WebSocket | null;

    constructor(){
      this.username = '';
      this.password = '';
      this.ws = null;
    }

    static set(username: string, password: string){
        UserObject.instance.username = username;
        UserObject.instance.password = password;
        UserObject.instance.ws = UserObject.getWebSocket(username, password);
    }

    static getUsername = (): string => UserObject.instance.username;
    static getPassword = (): string => UserObject.instance.password;

    static addWebSocketCallback = (func: (event: MessageEvent)=>void): void => {
        UserObject.instance.ws!.onmessage = (event) => {
            console.log('received msg:', event.data);
            func(event);
        }
    }

    static removeWebSocketCallback = (): void => {UserObject.instance.ws!.onmessage = () => {}};

    static reset = (): void => {
        UserObject.instance.ws!.close();
        UserObject.instance = new UserObject();
    }

    static getWebSocket(username: string, password: string): WebSocket{

      let wsPort = parseInt('1234')+1;

      let ws: WebSocket = new WebSocket(
        `ws://${window.location.hostname}:${wsPort}/?username=${username}&password=${password}`
      );
          ws.onopen = (event) => console.log("Connected to websocket.");
          return ws;
    }

}

export default UserObject