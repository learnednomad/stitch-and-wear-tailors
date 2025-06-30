Please analyze and fix the github issue: $ARGUMENTS.


Follow these steps:

# PLAN
1. Use 'gh issue view' to get the issue details
2. Understand the problem described in the issue
3. Ask clarifying questions if necessary
4. Understand the prior art for this issue
- Search the scratchpads for previous thoughts related to the issue
-Search PR to see if you can find history on this issue
-Search the codebase for relevant files
5. Think harder about how to break the issue down into a series of small manageable tasks.
6. Document your plan in a new scratch pad 
-include the issue name in the filename
-include a link to the issue in the scratchpad


# CREATE
- Create a new branch for the issue
- Solve the issue in small, manageable steps, according to your plan.
- Commit your changes after each step
- Move the card from backlog to inprogress in  https://github.com/users/learnednomad/projects/2

# TEST
- Use ios via mcp to test the changes if you have made changes to the UI
- Write rspec test to describe the expected behavior of your code 
- Run the full test suite to ensure you haven't broken anything
- If the tests are failing fix them
- Ensure that all tests are passing before moving on to the next step

# DEPLOY

- Open a PR and request review 
- Move card to done one branch is merged into main


Remember to use the GitHub CLI(`gh`) for all Github related tasks.


