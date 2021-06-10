import axios from "axios";
import React, { useState, useEffect } from "react";
import DateFnsUtils from "@date-io/date-fns"; // choose your lib
import {
  KeyboardDatePicker,
  MuiPickersUtilsProvider,
} from "@material-ui/pickers";
import moment from "moment";

// import {
//     MuiPickersUtilsProvider,
//
//   } from '@material-ui/pickers';

function SportHome() {
  const [data, setData] = useState();
  const [selectedDate, handleDateChange] = useState(new Date());
  const [events, setEvents] = useState([]);

  useEffect(() => {
    //this assume the selectedDate is in New Zealand Time!
    //one day ahead of US
    const formattedDate = moment(selectedDate)
      .subtract(1, "day")
      .format("YYYYMMDD");
    axios
      .get(
        `https://secure.espn.com/core/nba/scoreboard?xhr=1&render=true&device=desktop&country=nz&lang=en&region=us&site=espn&edition-host=espn.com&site-type=full&date=${formattedDate}`
      )
      .then(function (response) {
        setData(response.data.content);
        setEvents([]);
        response.data.content.sbData.events.forEach((event) => {
          axios
            .get(
              `https://site.api.espn.com/apis/site/v2/sports/basketball/nba/summary?event=${event.id}`
            )
            .then((res) => {
            const winProbLength = res.data.winprobability.length;
              const percentageOfGame = Math.round(winProbLength/10);  
              const endGame = res.data.winprobability.slice(winProbLength-percentageOfGame,winProbLength); 
              
             console.log(res.data)
              const interest={noInterest:false,mildInterest:false,highInterest:false}
              console.log(endGame)
              endGame.forEach((play)=>{
                  const close = play.homeWinPercentage;
                  if(close>0.4 && close<0.6){
                    interest.highInterest=true;
                  }else if(close>0.3 && close<0.7){
                    interest.mildInterest=true;
                  }else{
                    interest.noInterest = true;
                  }
                })  
               console.log(interest) 

              res.data["interest"] = interest
              setEvents((events) => {
                return [...events, res.data];
              });
            });
        });
      })
      .catch(function (error) {
        console.error(error);
      });
  }, [selectedDate]);
  return (
    <div>
      <MuiPickersUtilsProvider utils={DateFnsUtils}>
        <KeyboardDatePicker
          disableToolbar
          variant="inline"
          format="dd/MM/yyyy"
          margin="normal"
          id="date-picker-inline"
          label="Date picker inline"
          value={selectedDate}
          onChange={handleDateChange}
          KeyboardButtonProps={{
            "aria-label": "change date",
          }}
        />
      </MuiPickersUtilsProvider>
      <DisplayEvents data={data} date={selectedDate} />
      {events.map((event) => {
        return  <p>{event.gameInfo.venue.address.city} - {event.interest.highInterest ? "highInterest" : event.interest.mildInterest?"mild":"no interest"}</p>;
      })}
    </div>
  );
}

const DisplayEvents = ({ data, date }) => {
  return (
    <div>
      {<p>Results for: {moment(date).format("DD/MM/YYYY")} (NZ time)</p>}
      {data ? (
        <ul>
          {data.sbData.events.map((event) => {
            return <li key={event.id}>{event.name}</li>;
          })}
        </ul>
      ) : (
        "loading..."
      )}
    </div>
  );
};

const DisplayEvent = (events) => {
  return;
};

export default SportHome;
