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

function PartnerPage({match}: {match: RouterMatch}){

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

    //let [showRating, setShowRating]: [boolean, SetState<boolean>] = React.useState(false as boolean);

    return <img src="../../../../public/parnterImage.svg"></img>;
}

export default PartnerPage;