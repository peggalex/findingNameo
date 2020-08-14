import $ from 'jquery';

export var isMobile = () => window.matchMedia("(orientation: portrait)").matches;

export type SetState<T> = React.Dispatch<React.SetStateAction<T>>;
export type Ref<T> = React.MutableRefObject<T>;
export type Dispatch<T> = React.Dispatch<T>;

export function arrayBufferToHex(arrayBuffer: ArrayBuffer){
    let intArray = new Uint8Array(arrayBuffer),
        hashArray = Array.from(intArray),
        hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');

    return hashHex;
}

export async function hash(toHash: string){
    // https://developer.mozilla.org/en-US/docs/Web/API/SubtleCrypto/digest
    let hashEnc = new TextEncoder().encode(toHash),                        				  
        hashBuffer = await crypto.subtle.digest('SHA-512', hashEnc),
        keyHex = arrayBufferToHex(hashBuffer);

    return keyHex;
}

export function alertError(xhr: JQuery.jqXHR, status: JQuery.Ajax.ErrorTextStatus, error: string) {
    alert(`${error}: ${xhr.responseText}`);
}  

export async function waitForAjaxCall(method: 'post' | 'get' | 'put', url: string): Promise<any> {
    url = url.replace(/[ \t\n]/g, ''); // get rid of empty spaces and newlines
  
    return new Promise((resolve, reject) => $.ajax({
      method: method,
      url: url
    }).done(resolve).fail((data, _, error) => {
      reject(alertError(data, _, error));
    }));
}

export function messageStrToJSON(messageStr: string){
	let message = JSON.parse(messageStr);
	if (message.error != null){
		throw new Error(message.error);
	}
	return message;
}

export const avg = (x1: any, x2: any) => {
    let x = ((parseFloat(x1)+parseFloat(x2))/2).toFixed(1);
    return isNaN(x as any) ? "?" : x;
};


export interface PageState {
    pageName: string;
    element: JSX.Element|null;
}

export interface PageAction{
    type: string;
    pageName: string;
    element?: JSX.Element
}

