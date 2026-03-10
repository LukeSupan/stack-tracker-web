import { useState, useEffect } from "react"

const API_URL = import.meta.env.VITE_API_URL || "http://127.0.0.1:8000" // vite for deployment or local

// ------------
// COMPONENTS
// ------------

// player card for individual player stats with name and player (contains StatRow)

// section with title and children, just a div with a header

// stat row component with label then value. for individual stats, and matchup stats. maybe change?

// comp row for showing the non-role comp

// role comp row for showing the role comp 

// matchup block, inside contains stat rows


// ------------
// App
// ------------

    // useState for the mode
    // useState for setting data (local storage here)
    // useState for setting error
    // useState for setting loading

    // useEffect for pasteInput local storage
    // useEffect for gameTag local storage for ez mode
    // useEffect for games local storage

    // function to convert easy mode info to lines for api
    // function to convert paste mode input to lines for api
    // function to convert to paste mode
    // function to convert to easy mode
    // function to toggle the mode
    // function to addGame
    // function to enter key press (add game of course)

    // async function to submit data (api call)

    // return of everything. which makes the actual input ui, then mostly uses components for results

