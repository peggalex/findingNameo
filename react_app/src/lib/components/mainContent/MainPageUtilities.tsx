import React from 'react';
import {
    isMobile, SetState, 
    Dispatch, Ref, 
    avg, waitForAjaxCall, 
    messageStrToJSON, PageState, 
    PageAction
} from '../../Utilities';

import Icons from '../../Icons';
import {Rate, DynamicRating} from '../../Ratings';
import UserObject from '../../UserObject';
import { useHistory, match as RouterMatch } from 'react-router-dom';

function isMaleStr(isMale: number){
    switch (isMale){
        case -1: 
            return 'unisex';
        case 0:
            return 'girl';
        case 1:
            return 'boy';
        default:
            throw new Error(`isMale: '${isMale}' must be an int in {-1,0,1}.`);
    }
}

export function genderStr(isMale: number){
    switch (isMale){
        case -1: 
            return 'unisex';
        case 0:
            return 'female';
        case 1:
            return 'male';
        default:
            throw new Error(`genderStr: '${isMale}' must be an int in {-1,0,1}.`);
    }
}

export function getNumberSuffix(number: string | number){
    switch (parseInt(number as any)){
        case 1:
            return "st";

        case 2:
            return "nd";

        case 3:
            return "rd";

        default:
            return "th";
    }
}

export function PersonRating({isYou, rating}: {isYou: boolean, rating: number|string}){
    return (
        <div className={(isYou ? 'you' : 'partner')+'Rating personRating'}>
            <p>{rating}</p>
            <p>{isYou ? 'you' : 'partner'}</p>
        </div>
    );
}

export class RatingError { message: string; constructor(msg: string){ this.message=msg; } }

export function Rating({pageDispatch, nameObj}: {pageDispatch: Dispatch<PageAction>, nameObj: Rate}){

    let history = useHistory();
    let {name, isMale, rank, myRating, partnerRating} = nameObj;
        
    let popSuffix: string|null = rank ? getNumberSuffix(rank!) : null;
    const goToRate = () => {
        history.push(`/rate/${name}/isMale/${isMale}`);
    }

    return (
        <div className='itsARate row centerCross clickable' onClick={goToRate}>
            <div className={'col center gender '+isMaleStr(isMale)}>
                <p>{isMaleStr(isMale)}</p>
            </div>
            <div className='genderPlaceholder'></div>
            <div className='namePop'>
                <p className={'name '+(name.length > 9 ? 'long':'')}>{name}</p>
                { rank ? 
                <div className='row'>
                    <p className='popLabel'>popularity</p>
                    <p className='pop'>{rank}</p>
                    <p className={popSuffix + ' popSuffix'}></p>
                </div> : <p className="popLabel">+ new name</p> }
            </div>
            <div className='spacer'></div>
            {Icons.StarIcon}
            <p className='rating'>{avg(myRating, partnerRating)}</p>
            <div className='partnerRatings'>
                <PersonRating rating={myRating==null ? '?' : myRating.toFixed(1)} isYou={true}/>
                <PersonRating rating={partnerRating==null ? '?' : partnerRating.toFixed(1)} isYou={false}/>
            </div>
        </div>
    );
}

export interface FilterObj {
    filter: string, 
    subFilter: string, 
    setFilter: SetState<string>, 
    setSubFilter: SetState<string>
}
