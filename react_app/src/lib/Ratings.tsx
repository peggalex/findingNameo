import {waitForAjaxCall} from './Utilities';
import UserObject from './UserObject';

export class DynamicRating {
    name: string;
    isMale: string;
    username: string;
    rating: string;

	constructor(
                {name, isMale, username, rating}: 
                {name: string, isMale: string, username: string, rating: string}
            ){

        this.name = name;
        this.isMale = isMale;
        this.username = username;
        this.rating = rating;
    }
    
    isPartners = (): boolean => this.username != UserObject.getUsername();
}


export class Rate {
    [key: string]: string | number | null;
    name: string;
    isMale: number;
    rank: string|null;
    myRating: number|null;
    partnerRating: number|null;

    constructor(rateObj: {
                    name: string, 
                    isMale: string, 
                    rank: string|null, 
                    myRating: string|null, 
                    partnerRating: string|null
                }
            ){

        let { name, isMale, rank, myRating, partnerRating } = rateObj;
        this.name = name;
        this.isMale = parseInt(isMale);
        this.rank = rank;
        this.myRating = myRating ? parseFloat(myRating!) : null;
        this.partnerRating = partnerRating ? parseFloat(partnerRating!) : null;
    }

    static async getRandomRate(gender: 'any'|'male'|'female'|'unisex'){
        // gender in {any, male, female, unisex}
        let res = await waitForAjaxCall('get', `
            /randomName/${UserObject.getUsername()}
            /password/${UserObject.getPassword()}
            /gender/${gender}
        `)
        let rate = new Rate(res);
        if (rate.name == null) {
            console.log('res', res);
            alert(`No ${gender} ratings created (yet).`);
            return null;
        }
        return rate;
    }
}
