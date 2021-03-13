
class UserObject {
    static instance: UserObject = new UserObject(); // singleton
    loggedIn: boolean;
    username: string;
    password: string;
    ws: WebSocket | null;

    constructor(){
        this.loggedIn = false;
        this.username = '';
        this.password = '';
        this.ws = null;
    }

    static set(username: string, password: string){
        let inst = UserObject.instance;
        inst.loggedIn = true;
        inst.username = username;
        inst.password = password;
        inst.ws = UserObject.getWebSocket(username, password);
    }

    static isLoggedIn = (): boolean => UserObject.instance.loggedIn;
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

      let ws: WebSocket = new WebSocket(
        `wss://${window.location.hostname}${process.env.PUBLIC_URL}/webSocket/?username=${username}&password=${password}`
      );
          ws.onopen = (event) => console.log("Connected to websocket.");
          return ws;
    }

}

export default UserObject