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
import MenuItem from "@material-ui/core/MenuItem";
import FormHelperText from "@material-ui/core/FormHelperText";
import FormControl from "@material-ui/core/FormControl";
import Select from "@material-ui/core/Select";
import InputLabel from "@material-ui/core/InputLabel";

import { makeStyles } from "@material-ui/core/styles";

const nba = Object.freeze({
  id: "nba",
  link: "basketball/nba",
  scoresID: "plays",
  name: "nba",
});
const nfl = Object.freeze({
  id: "nfl",
  link: "football/nfl",
  scoresID: "scoringPlays",
  name: "nfl",
});

const SPORTS_ENUM = Object.freeze({ [nba.id]: nba, [nfl.id]: nfl });

const useStyles = makeStyles((theme) => ({
  formControl: {
    margin: theme.spacing(1),
    minWidth: 300,
  },
  selectEmpty: {
    marginTop: theme.spacing(2),
  },
}));

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

const getScore = (eventData, sport) => {
  const playArray = eventData[sport.scoresID];
  const recentPlay = playArray[playArray.length - 1];
  return recentPlay;
};

function SportHome() {
  const classes = useStyles();
  const [cancelToken, setCancelToken] = useState(axios.CancelToken.source());
  const [selectedDate, handleDateChange] = useState();
  const [events, setEvents] = useState({});
  const [displayScores, setDisplayScores] = useState([]);
  const [interestMargin, setInterestMargin] = useState({
    defaultHigh: 0.1,
    high: 0.1,
    mild: 0.2,
  });
  const [loadingEvents, setLoadingEvents] = useState(true);
  const [activeSport, setActiveSport] = useState(SPORTS_ENUM.nfl);
  const SPORT_ESPN_LINK = activeSport.link;
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
  }, []);

  useEffect(() => {
    setLoadingEvents(true);
    setEvents({});
    if (!selectedDate || isNaN(selectedDate.getTime())) {
      cancelToken.cancel("user requested events");
      setLoadingEvents(false);
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
        `http://site.api.espn.com/apis/site/v2/sports/${SPORT_ESPN_LINK}/scoreboard?dates=${formattedDate}`,
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
        });
      });
  }, [selectedDate, activeSport]);

  useEffect(() => {
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
        <FormControl className={classes.formControl}>
          <InputLabel id="demo-simple-select-label">Sport</InputLabel>
          <Select
            labelId="demo-simple-select-label"
            id="demo-simple-select"
            value={activeSport.name}
            renderValue={() => activeSport.name}
            onChange={(event) => {
              setActiveSport(event.target.value);
            }}
          >
            {/* TODO make this dynamic */}
            {/* {Object.keys(SPORTS_ENUM).map((v)=>{
            console.log(v);
            return <MenuItem value={v.id}>huh{v.name}</MenuItem>
          })}
           */}
            <MenuItem value={nba}>{nba.name}</MenuItem>
            <MenuItem value={nfl}>{nfl.name}</MenuItem>
          </Select>
        </FormControl>
      </Grid>
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
          onClick={() =>
            handleDateChange(moment(selectedDate).add(1, "day").toDate())
          }
        >
          <ArrowForwardIosIcon />
        </button>
      </Grid>
      {loadingEvents ? (
        "Loading.."
      ) : (
        <Grid item xs={12}>
          {selectedDate && !isNaN(selectedDate.getTime()) && 
            <DisplayDate
              date={selectedDate}
              interestMargin={interestMargin}
              setInterestMargin={setInterestMargin}
            />
          }
          <DisplayEvents
            events={events}
            displayScores={displayScores}
            setDisplayScores={setDisplayScores}
            activeSport={activeSport}
          />
        </Grid>
      )}
    </Grid>
  );
}

const DisplayDate = ({ date, interestMargin, setInterestMargin }) => {
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
    </div>
  );
};
const DisplayEvents = ({
  events,

  displayScores,
  setDisplayScores,

  activeSport,
}) => {
  return (
    <div>
      {Object.keys(events).length > 0
        ? Object.keys(events).map((key) => {
            return (
              <DisplayEvent
                key={events[key].id}
                event={events[key]}
                displayScores={displayScores}
                setDisplayScores={setDisplayScores}
                activeSport={activeSport}
              />
            );
          })
        : "No events"}
    </div>
  );
};

const DisplayEvent = ({
  event,
  displayScores,
  setDisplayScores,
  activeSport,
}) => {
  const now = new Date();
  return (
    <Paper elevation={3} style={{ padding: "10px", margin: "10px" }}>
      <h1>{event.name}</h1>
      <p>
        {event.status.type.description} - {event.status.type.detail} as of{" "}
        {moment(now).format("h:mmA")}
      </p>
      {event.status.type.name !== "STATUS_SCHEDULED" && (
        <DisplayEventScores
          id={event.id}
          data={event.data}
          displayScores={displayScores}
          setDisplayScores={setDisplayScores}
          activeSport={activeSport}
        />
      )}
    </Paper>
  );
};

const DisplayEventScores = ({
  id,
  data,
  displayScores,
  setDisplayScores,
  activeSport,
}) => {
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
          getScore(data, activeSport).awayScore +
          " - " +
          getScore(data, activeSport).homeScore
        )}
      </Grid>
    </Grid>
  ) : (
    "loading"
  );
};

export default SportHome;
