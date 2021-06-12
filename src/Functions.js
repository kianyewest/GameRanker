import axios from "axios";
import moment from "moment";
import {SPORTS_ENUM} from "./Sports"

export const  calculateInterest = (winprobability, highMargin, mildMargin) => {
    const interest = {
      noInterest: false,
      mildInterest: false,
      highInterest: false,
    };
    if (winprobability) {
        
      const winProbLength = winprobability.length;
      const percentageOfGame = Math.round(winProbLength / 10);
      const endGame = winprobability.slice(
        winProbLength - percentageOfGame,
        winProbLength
      );
      console.log(endGame)  
      endGame.forEach((play) => {
          console.log(0.5-play.homeWinPercentage)
        const close = play.homeWinPercentage;
        if (close > 0.5 - highMargin && close < 0.5 + highMargin) {
          interest.highInterest = true;
        } else if (close > 0.5 - mildMargin && close < 0.5 + mildMargin) {
          interest.mildInterest = true;
        } else {
          interest.noInterest = true;
        }
      });
    }else{
        console.log("unable to find win probability")
    }
    return interest;
  };
  
  export const getScore = (eventData, sport) => {
    console.log(eventData)
    console.log(sport.scoresID)
    const playArray = eventData[sport.scoresID];
    const recentPlay = playArray[playArray.length - 1];
    return recentPlay;
  };
  
  export const getEvent = (event,SPORT_ESPN_LINK,newCancelToken,interestMargin,localEvents,setEvents)=>{
    axios
              .get(
                `https://site.api.espn.com/apis/site/v2/sports/${SPORT_ESPN_LINK}/summary?event=${event.id}`,
                { cancelToken: newCancelToken.token }
              )
              .catch(function (thrown) {
                if (axios.isCancel(thrown)) {
                  console.log("Request canceled inner: ", thrown.message);
                } else {
                  console.error(thrown.message);
                }
              })
              .then((res) => {
                if (!res) {
                  return;
                }
                res.data["interest"] = calculateInterest(
                  res.data.winprobability,
                  interestMargin.high,
                  interestMargin.mild
                );
  
                const localEvent = localEvents[event.id];
                localEvent["data"] = res.data;
                setEvents((prevEvents) => ({
                  ...prevEvents,
                  [event.id]: localEvent,
                }));
              });
  }
  
  export  const getEvents = (formattedDate,SPORT_ESPN_LINK,newCancelToken,interestMargin,setLoadingEvents,setEvents)=>{
    axios
        .get(
          `https://site.api.espn.com/apis/site/v2/sports/${SPORT_ESPN_LINK}/scoreboard?dates=${formattedDate}`,
          { cancelToken: newCancelToken.token }
        )
        .catch(function (thrown) {
          if (axios.isCancel(thrown)) {
            console.log("Request canceled:    ->", thrown.message);
          } else {
            console.error(thrown.message);
          }
        })
        .then(function (response) {
          if (!response) {
            return;
          }
          setLoadingEvents(false);
  
          const localEvents = {};
          response.data.events.forEach(
            (event) => (localEvents[event.id] = event)
          );
  
          setEvents(localEvents);
  
          response.data.events.forEach((event) => {
            getEvent(event,SPORT_ESPN_LINK,newCancelToken,interestMargin,localEvents,setEvents);
          });
        });
  }
  
  export const getDateFromParam =(urlParams,handleDateChange) =>{
    const dateStr = urlParams.get("date");
    if (dateStr) {
      console.log("got date string: ", dateStr);
      const date = moment(dateStr, "DDMMYYYY").toDate();
      if (!isNaN(date.getTime())) {
        handleDateChange(date);
      } else {
        handleDateChange(new Date());
      }
    } else {
      handleDateChange(new Date());
    }
  }
  
  export const getSportFromParam =(urlParams,setActiveSport) =>{
    const sportStr = urlParams.get("sport");
      if (sportStr) {
        const sport = SPORTS_ENUM[sportStr];
        if (sport) {
          setActiveSport(sport);
        } else {
          setActiveSport(SPORTS_ENUM.nba);
        }
      } else {
        setActiveSport(SPORTS_ENUM.nba);
      }
  }