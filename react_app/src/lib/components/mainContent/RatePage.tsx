import React from 'react';
import {
    isMobile, SetState,
    Ref, waitForAjaxCall, 
    messageStrToJSON, avg,
    hasAttributes, getRatingsGetIsMore
} from '../../Utilities';
import { genderStr, getNumberSuffix, RatingError, Rating } from './MainPageUtilities';

import Icons from '../../Icons';
import {Rate, DynamicRating} from '../../Ratings';
import UserObject from '../../UserObject';
import { useHistory, match as RouterMatch } from 'react-router-dom';

/*function NewRatings({close}: {close: ()=>void}){
    let [searchTerm, setSearchTerm]: [string, SetState<string>] = React.useState('');
    let [ratings, setRatings]: [Rate[], SetState<Rate[]>] = React.useState([] as Rate[]);

    React.useEffect(()=>{
        getRatingsGetIsMore('popularity', 'asc', 10, 0, searchTerm)
            .then(({ratings, isMore})=> setRatings(ratings));
    });
    return (
        <div id='searchContainerOuter' className='centerAll'>
            <div id='searchContainer' className='col centerAll'>
                <div id='closeNewRatingsContainer' className='row'>
                    <div className='spacer'></div>
                    <button id='closeNewRatings' onClick={close}>{Icons.CrossIcon}</button>
                </div>
                <input id='searchNewRatings' onChange={(e) => setSearchTerm(e.target.value)}/>
                {ratings.map((r)=><p>{r.name}</p>)}
            </div>
        </div>
    );
}*/

const randomGenders: string[] = ['any', 'male', 'female', 'unisex'];
function RatePage({match}: {match: RouterMatch}){


    let [rateObj, setRateObj]: [Rate|null, SetState<Rate|null>] = React.useState(null as Rate|null);
    let [myCurrentRating, setMyCurrentRating]: [number|null, SetState<number|null>] = React.useState<number|null>(null);
    let [ratingHasChanged, setRatingHasChanged] = React.useState(false);

    React.useEffect(()=>{
        setRatingHasChanged((rateObj ? rateObj.myRating : null) != myCurrentRating);
    }, [rateObj, myCurrentRating]);

    let [randomGenderIndex, setRandomGenderIndex]: [number, SetState<number>] = React.useState(0);

    let inputRatingRef: Ref<HTMLInputElement|null> = React.useRef(null);

    let updateRating = (rating: number|null): void => {
        setMyCurrentRating(rating);
        let inputRating = inputRatingRef.current;
        if (inputRating != null) inputRating.value = rating == null ? "" : rating.toFixed(1);
    }

    let setRandomRate = (): void => {
        if (ratingHasChanged){
            if (!window.confirm(
                "Rating has changed without saving, are you sure you want to leave?"
            )) return;
        }
        setRateObj(null);
        Rate.getRandomRate(randomGenders[randomGenderIndex] as ('any'|'male'|'female'|'unisex'))
        .then((rate): void => {
            if (rate == null) return;
            updateRating(rate.myRating!);
            setRateObj(rate);
        });
    }
    React.useEffect((): ()=>void => {
        UserObject.removeWebSocketCallback();

	    UserObject.addWebSocketCallback(async (event) => {

	    	let {type, dynamicRating} = messageStrToJSON(event.data);
            dynamicRating = new DynamicRating(dynamicRating);
            switch (type){
                case "rating":
                    if (!(dynamicRating && rateObj)) return;
                    if (rateObj.name == dynamicRating.name && 
                            rateObj.isMale == dynamicRating.isMale){   
            
                        let ratingName = dynamicRating.isPartners() ? 'partnerRating' : 'myRating';
                        rateObj[ratingName] = parseFloat(dynamicRating.rating);
                        setRateObj({...rateObj});
                    }
                    break;
                case "partner":
                    break;
                default:
                    throw new Error(`unknown websocket type: "${type}"`);
            }
        });

        return UserObject.removeWebSocketCallback;
    });

    React.useEffect((): void =>{
        if (hasAttributes(match.params, ['name', 'isMale'])){
            let {name, isMale} = match.params as {name: string, isMale: string};
            waitForAjaxCall('get', `
                /getName/${UserObject.getUsername()}
                /password/${UserObject.getPassword()}
                /name/${name}
                /isMale/${isMale}
            `).then((res) => {
                let rate = new Rate(res.rating);
                updateRating(rate.myRating);
                setRateObj(rate);
            });
        } else {
            setRandomRate();
        }
    }, []);

    //let [showRating, setShowRating]: [boolean, SetState<boolean>] = React.useState(false as boolean);

    if (rateObj == null) return Icons.LoadingIcon;

    let {name, isMale, rank, myRating, partnerRating} = rateObj;

    let _genderStr = genderStr(isMale);

    let validateInput = () => {
        let inputEl = inputRatingRef.current;
        if (inputEl == null) return;
        let ratingStr = inputEl.value;

        try {
            if (isNaN(ratingStr as any)) throw new RatingError("Rating must be a number.");

            let rating = parseFloat(ratingStr);

            if (!((0 <= rating) || (rating <= 10))) throw new RatingError("Rating must be between [0, 10].");
            if (!((rating*2)%1==0)) throw new RatingError("Rating must be a whole or half number.");

            updateRating(rating);
            console.log('rating set to:', rating);
            inputEl.setCustomValidity("");
            return true;

        } catch (e) {
            if (e instanceof RatingError){
                inputEl.setCustomValidity(e.message);
                inputEl.reportValidity();
                return false;
            } else {
                throw e;
            }
        }
    }

    return (
        <div id='ratePage' className="col centerAll">
            <div id='rateHeader' className={`spacer col ${_genderStr}`}>
                <div className="row">
                    <div className='spacer'></div>
                    <div id='rateGender' className='row centerCross'>
                        <p>Gender: </p>
                        <p id='rateGenderActual'>{_genderStr}</p>
                    </div>
                </div>
                <p id='rateName' className={(name.length > 9 ? 'long':'')}>{name}</p>
                { (rank) ? <div id='ratePop' className='row centerCross'>
                    {Icons.PopIcon}
                    <p id='popLabel'>popularity</p>
                    <p id='pop'>{rank}</p>
                    <p id='popSuffix' className={getNumberSuffix(rank)}></p>
                </div> : <div id='ratePop'><p>+ new name</p></div>}
                <div className='spacer'></div>
                <div id='rateRatingContainer' className='row centerCross'>
                    {Icons.StarIcon}
                    <p id='rateRating'>{avg(myCurrentRating, partnerRating)}</p>
                </div>
            </div>
            <section className={`${isMobile() ? 'col' : 'row'} spacer`}>
                <div className='row centerCross spacer'>
                    <div className='spacer'></div>
                    <div className='rating col centerCross'>
                        <p>Your Rating</p>
                        <div className="col centerCross">
                            <div className="row centerCross">
                                <div
                                    className='clickable'
                                    onClick={()=>{
                                        let currentRating = (myCurrentRating == null) ? 5 : myCurrentRating;
                                        console.log('rating is:', currentRating);
                                        if ((currentRating+=0.5) > 10) return;
                                        updateRating(currentRating);
                                    }}
                                >
                                    {Icons.ArrowUpIcon}
                                </div>
                                <form>
                                    <input 
                                        ref = {inputRatingRef}
                                        onChange={validateInput}
                                        className='ratingNumber' 
                                        name='ratingNumber'
                                        placeholder="?" 
                                        defaultValue={myCurrentRating != null ? myCurrentRating.toFixed(1) : ''}
                                    />
                                </form>
                                <div
                                    className='clickable'
                                    onClick={()=>{
                                        let currentRating = (myCurrentRating == null) ? 5 : myCurrentRating;
                                        if ((currentRating-=0.5) < 0) return;
                                        updateRating(currentRating);
                                    }}
                                >
                                    {Icons.ArrowDownIcon}
                                </div>
                            </div>
                            <p 
                                onClick = {async ()=>{
                                    console.log(await waitForAjaxCall('put', `
                                        /rate/${UserObject.getUsername()}
                                        /password/${UserObject.getPassword()}
                                        /name/${name}
                                        /isMale/${isMale}
                                        /rating/${myCurrentRating}
                                    `));
                                    let _rateObj: Rate = {...rateObj!};
                                    _rateObj.myRating = myCurrentRating;
                                    setRateObj(_rateObj);
                                }}
                                className={
                                    'saveSpace saveButton ' + (ratingHasChanged ? 'canSave clickable' : 'notCanSave disabled')
                                }
                            >save</p>
                        </div>
                    </div>
                    <div id='ratingPartner' className='rating col centerCross'>
                        <p>Partner Rating</p>
                        <p className='ratingNumber centerAll'>{partnerRating != null ? partnerRating.toFixed(1) : Icons.ClockIcon}</p>
                        <p className='saveSpace'></p>
                    </div>
                    <div className='spacer'></div>
                </div>
                <div id='newRating' className='col centerCross spacer'>
                    <div className='spacer'></div>
                    <p className='newRateDesc'>Rate a random name you haven't rated yet</p>
                    <div id='randomButton' className="row centerCross">
                        <button 
                            id='randomName' 
                            className='newRate row centerCross' 
                            onClick={setRandomRate}
                            type='button'
                        >{Icons.DiceIcon}Random Name</button>
                        <button className="row centerCross" onClick={
                            ()=>setRandomGenderIndex((randomGenderIndex+1)%randomGenders.length)
                        }>
                            <p className='spacer'>{randomGenders[randomGenderIndex]}</p> 
                            {Icons.ChevronIcon}
                        </button>
                    </div>
                    <div className='spacer'></div>
                    {/*<p className='newRateDesc'>Search for an existing name, or add a new one</p>
                    <button id='searchName' onClick={()=>setShowRating(!showRating)} className='newRate'>{Icons.SearchIcon}</button>
                    <div className='spacer'></div>*/}
                </div>
            </section>
            {/*showRating ? <NewRatings close={()=>setShowRating(false)}/> : null*/}
        </div>
    );
}

export default RatePage;