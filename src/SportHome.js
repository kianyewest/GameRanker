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
  const [cancelToken, setCancelToken] = useState(axios.CancelToken.source());
  const [selectedDate, handleDateChange] = useState();
  const [events, setEvents] = useState({});
  const [displayScores, setDisplayScores] = useState([]);
  const [interestMargin, setInterestMargin] = useState({
    defaultHigh: 0.1,
    high: 0.1,
    mild: 0.2,
  });

  useEffect(() => {
    const queryString = window.location.search;
    console.log("params: ", queryString);
    const urlParams = new URLSearchParams(queryString);
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
  }, []);

  useEffect(() => {
    setEvents({});
    if (!selectedDate || isNaN(selectedDate.getTime())) {
      cancelToken.cancel("user requested events");
      return;
    }


    const formattedDate = moment(selectedDate)
      .subtract(1, "day")
      .format("YYYYMMDD");

    //cancel previous requests
    cancelToken.cancel("user requested events for " + formattedDate);
    const newCancelToken = axios.CancelToken.source();
    setCancelToken(newCancelToken);

    axios
      .get(
        `https://secure.espn.com/core/nba/scoreboard?xhr=1&render=true&device=desktop&country=nz&lang=en&region=us&site=espn&edition-host=espn.com&site-type=full&date=${formattedDate}`,
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
        const localEvents = {};
        response.data.content.sbData.events.forEach(
          (event) => (localEvents[event.id] = event)
        );

        setEvents(localEvents);

        response.data.content.sbData.events.forEach((event) => {
          axios
            .get(
              `https://site.api.espn.com/apis/site/v2/sports/basketball/nba/summary?event=${event.id}`,
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
              console.log("localEvent: ", localEvent);
              setEvents((prevEvents) => ({
                ...prevEvents,
                [event.id]: localEvent,
              }));
            });
        });
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
          onClick={() =>
            handleDateChange(moment(selectedDate).subtract(1, "day").toDate())
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
          onClick={() => handleDateChange(moment(selectedDate).add(1, "day").toDate())}
        >
          <ArrowForwardIosIcon />
        </button>
      </Grid>
      {/* {selectedDate && !isNaN(selectedDate.getTime()) && ( */}
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
      {/* )} */}
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
      Set interest rangeeee (lower number means closer game)
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
    <Paper elevation={3} style={{ padding: "10px", margin: "10px" }}>
      <h1>{event.name}</h1>
      <p>
        {event.status.type.description} - {event.status.type.detail} as of{" "}
        {moment(now).format("h:mmA")}
      </p>
      {event.status.type.name != "STATUS_SCHEDULED" && (
        <DisplayEventScores
          id={event.id}
          data={event.data}
          displayScores={displayScores}
          setDisplayScores={setDisplayScores}
        />
      )}
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
          data.plays[data.plays.length - 1].awayScore +
          " - " +
          data.plays[data.plays.length - 1].homeScore
        )}
      </Grid>
    </Grid>
  ) : (
    "loading"
  );
};

export default SportHome;
