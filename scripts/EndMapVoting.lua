-- Server Script in ServerScriptService

local voteEvent = game.ReplicatedStorage.voteEvent
local voteCounts = {}  -- Table to keep track of votes

-- Function to handle incoming votes
voteEvent.OnServerEvent:Connect(function(player, mapName)
	if not voteCounts[mapName] then
		voteCounts[mapName] = 0
	end
	voteCounts[mapName] = voteCounts[mapName] + 1
end)

-- Function to end voting and determine the winning map
local function endVoting()
	local maxVotes = 0
	local winningMap = nil
	for mapName, count in pairs(voteCounts) do
		if count > maxVotes then
			maxVotes = count
			winningMap = mapName
		end
	end
	print("Winning map is:", winningMap)  -- Debug: Print winning map to the output
	-- Here you can add logic to transition to the winning map
	voteCounts = {}  -- Reset vote counts for the next round
end

-- Adding a timer to automatically call endVoting after a set period
local votingPeriod = 60  -- seconds, set this to whatever is suitable for your game
local timer = game:GetService("Workspace"):WaitForChild("Timer")  -- Assuming there's a Timer object in the Workspace

timer:WaitForChild("TimerValue").Value = votingPeriod  -- Initialize the timer
timer.Changed:Connect(function(newValue)
	if newValue <= 0 then
		endVoting()  -- Call endVoting when timer hits 0
	end
end)
