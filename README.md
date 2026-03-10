# Stack Tracker for Web

This is intended to be used socially; if you are hardcore about your specific stats, there are online trackers that do this better.
This specifically tracks:
- Individual stats overall and role-based
- Stats for specific teams
- Stats for role specific teams
- Matchups between you and others in games where you play each other (Rocket League or custom Overwatch games)

---


## Match Entry Formatting:
### IMPORTANT NOTICE:
Keep a .txt file or some other place to store your games. The site will remember your input in local storage, but keeping it safe locally is best.


### General Formatting
Your first line should always be a tag. There are currently a few supported tags. If you want more, message me and I'll add them as soon as I see it:
- hero_shooter -> Tank/DPS/Support/Result
- hero_shooter_versus -> Tank/DPS/Support/Result|Tank/DPS/Support/Result

- lanes -> Side/Mid/Result
- lanes_detailed -> Left/Mid/Right/Result

- generic -> Players/Result
- generc_versus -> Players/Result|Players/Result

- moba -> Top/Jungle/Mid/ADC/Support/Result

- one_vs_one -> Player/Result|Player/Result

>Games with _versus are for you vs other people you know. An example for generic_versus would be custom games in Rocket League
>Games with one_vs_one are for 1v1 specific games where there will be one person max per team. It just cuts down on fluff that generic_versus would have. Simple!


### Example
These are examples of hero_shooter. You can add as many players as you want to each role using commas, but the number of roles is preset.
```
tank,tank2(mvp)/dps1,dps2/support1,support2/win

tank,tank2(key),tank3,tank4/dps1/support1(mvp)/loss
```

- **commas**(``,``) are separators for multiple players in a role.
- **slashes**(``/``) are separators for different roles.
- **(mvp) and (key)** are tags that can be applied to one player, stats for them will be shown if present.
- You must fill all slots with something BUT ->
- Use `none` to fill slots that would be empty (randoms).
- One game per line, then go to a newline, each line should end with either win or loss. Ignore draws, I can add them if requested, but I didn't see the point.

## Examples of a full pasted input
### If you'd like to see example output, copy paste the following exactly
```
lanes
luke,aiden,jr(mvp)/alex(key)/loss
none/mar,kayla(key)/win
luke,mar/none/win
luke,mar/aiden,ray,kayla,dalton/win
```

