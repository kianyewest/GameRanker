import axios from "axios";
import React, { useState, useEffect } from "react";
import DateFnsUtils from "@date-io/date-fns"; // choose your lib
import {
  KeyboardDatePicker,
  MuiPickersUtilsProvider,
} from "@material-ui/pickers";
import moment from "moment";
import { Container, Grid, Paper } from "@material-ui/core";
import ArrowBackIosIcon from "@material-ui/icons/ArrowBackIos";
import ArrowForwardIosIcon from "@material-ui/icons/ArrowForwardIos";
import Slider from "@material-ui/core/Slider";
const calculateInterest = (winprobability, highMargin, mildMargin) => {
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

    endGame.forEach((play) => {
      const close = play.homeWinPercentage;
      if (close > 0.5 - highMargin && close < 0.5 + highMargin) {
        interest.highInterest = true;
      } else if (close > 0.5 - mildMargin && close < 0.5 + mildMargin) {
        interest.mildInterest = true;
      } else {
        interest.noInterest = true;
      }
    });
  }
  return interest;
};

function SportHome() {
  const [selectedDate, handleDateChange] = useState(new Date());
  const [events, setEvents] = useState({});
  const [displayScores, setDisplayScores] = useState([]);
  const [interestMargin, setInterestMargin] = useState({
    defaultHigh: 0.1,
    high: 0.1,
    mild: 0.2,
  });
  useEffect(() => {
    //this assume the selectedDate is in New Zealand Time!
    //one day ahead of US
    const formattedDate = moment(selectedDate)
      .subtract(1, "day")
      .format("YYYYMMDD");
    console.log("runnin");
    axios
      .get(
        `https://secure.espn.com/core/nba/scoreboard?xhr=1&render=true&device=desktop&country=nz&lang=en&region=us&site=espn&edition-host=espn.com&site-type=full&date=${formattedDate}`
      )
      .then(function (response) {
        setEvents({});
        const localEvents = {};
        response.data.content.sbData.events.forEach(
          (event) => (localEvents[event.id] = event)
        );

        // setEvents(localEvents);

        response.data.content.sbData.events.forEach((event) => {
          axios
            .get(
              `https://site.api.espn.com/apis/site/v2/sports/basketball/nba/summary?event=${event.id}`
            )
            .then((res) => {
              res.data["interest"] = calculateInterest(
                res.data.winprobability,
                interestMargin.high,
                interestMargin.mild
              );

              const localEvent = localEvents[event.id];
              localEvent["data"] = res.data;
              console.log("localEvent: ", localEvent);
              setEvents((prevEvents) => ({
                ...prevEvents,
                [event.id]: localEvent,
              }));
            });
        });
      })
      .catch(function (error) {
        console.error(error);
      });
  }, [selectedDate]);

  useEffect(() => {
    console.log("Updated: ", events);
    Object.keys(events).forEach((key) => {
      const updatedEvent = events[key];
      if (updatedEvent.data) {
        updatedEvent.data["interest"] = calculateInterest(
          updatedEvent.data.winprobability,
          interestMargin.high,
          interestMargin.mild
        );
        setEvents((prev) => ({ ...prev, [key]: updatedEvent }));
      }
    });
  }, [interestMargin]);

  return (
    <Grid
      container
      spacing={0}
      direction="column"
      alignItems="center"
      style={{ minHeight: "100vh" }}
    >
      <Grid item xs={12}>
        <button
          onClick={() => {
            console.log(displayScores);
          }}
        />
        <button
          onClick={() =>
            handleDateChange(moment(selectedDate).subtract(1, "day"))
          }
        >
          <ArrowBackIosIcon />
        </button>
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
        <button
          onClick={() => handleDateChange(moment(selectedDate).add(1, "day"))}
        >
          <ArrowForwardIosIcon />
        </button>
      </Grid>
      <Grid item xs={12}>
        <DisplayEvents
          events={events}
          date={selectedDate}
          displayScores={displayScores}
          setDisplayScores={setDisplayScores}
          interestMargin={interestMargin}
          setInterestMargin={setInterestMargin}
        />
      </Grid>
    </Grid>
  );
}

const DisplayEvents = ({
  events,
  date,
  displayScores,
  setDisplayScores,
  interestMargin,
  setInterestMargin,
}) => {
  return (
    <div>
      {<p>Results for: {moment(date).format("DD/MM/YYYY")} (NZ time)</p>}
      Set interest range (lower number means closer game)
      <Slider
        defaultValue={interestMargin.defaultHigh}
        step={0.001}
        marks
        min={0.001}
        max={0.5}
        valueLabelDisplay="auto"
        onChange={(event, val) => {
          setInterestMargin((prev) => ({ ...prev, high: val }));
        }}
      />
      {Object.keys(events).length > 0
        ? Object.keys(events).map((key) => {
            return (
              <DisplayEvent
                key={events[key].id}
                event={events[key]}
                displayScores={displayScores}
                setDisplayScores={setDisplayScores}
              />
            );
          })
        : "loading..."}
    </div>
  );
};

const DisplayEvent = ({ event, displayScores, setDisplayScores }) => {
  const now = new Date();
  return (
    <Paper elevation={3} style={{ padding: "10px" ,margin:"10px"}}>
      <h1>{event.name}</h1>
      <p>
        {event.status.type.description} - {event.status.type.detail} as of{" "}
        {moment(now).format("h:mmA")}
      </p>
      {event.status.type.name != "STATUS_SCHEDULED" && <DisplayEventScores
        id={event.id}
        data={event.data}
        displayScores={displayScores}
        setDisplayScores={setDisplayScores}
      />}
    </Paper>
  );
};

const DisplayEventScores = ({ id, data, displayScores, setDisplayScores }) => {
  return data ? (
    <Grid>
      <Grid item xs={6}>
        <p>
          {data.interest.highInterest
            ? "highInterest"
            : data.interest.mildInterest
            ? "mild"
            : "no interest"}
        </p>
      </Grid>
      <Grid item xs={6}>
        {!displayScores.includes(id) ? (
          <button
            onClick={() => {
              setDisplayScores((prev) => [...prev, id]);
            }}
          >
            Display Scores
          </button>
        ) : (
          data.plays[data.plays.length-1].awayScore +" - "+data.plays[data.plays.length-1].homeScore 
        )}
      </Grid>
    </Grid>
  ) : (
    "loading"
  );
};

export default SportHome;
