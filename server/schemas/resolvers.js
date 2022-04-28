const { User, Thought } = require('../models');
// GraphQL built in authentication error handling
const { AuthenticationError } = require('apollo-server-express');
// imports signToken function for authentication
const { signToken } = require('../utils/auth');



// The resolvers object to handling queries and mutations
const resolvers = {
  Query: {
    // me() method query for token authentication
    me: async (parent, args, context) => {
      // this checks for context.user and throws an authentication error if it 
      // does not exist.
      if (context.user) {
        const userData = await User.findOne({ _id: context.user._id })
          .select('-__v -password')
          .populate('thoughts')
          .populate('friends');
    
        return userData;
      }
    
      throw new AuthenticationError('Not logged in');
    },
    // get all thoughts
    thoughts: async (parent, { username }) => {
      const params = username ? { username } : {};
      return Thought.find(params).sort({ createdAt: -1 });
    },
    // get a single thought by it's _id
    thought: async (parent, { _id }) => {
      return Thought.findOne({ _id });
    },
    // get all users
    users: async () => {
      return User.find()
        .select('-__v -password')
        .populate('thoughts')
        .populate('friends');
    },
    // get a user by username
    user: async (parent, { username }) => {
      return User.findOne({ username })
        .select('-__v -password')
        .populate('friends')
        .populate('thoughts');
    },
  },

  Mutation: {
    addUser: async (parent, args) => {
      const user = await User.create(args);
      // authentication
      const token = signToken(user);

      return { token, user };
    },
    login: async (parent, { email, password }) => {
      const user = await User.findOne({ email });
    
      if (!user) {
        throw new AuthenticationError('Incorrect credentials');
      }
    
      const correctPw = await user.isCorrectPassword(password);
    
      if (!correctPw) {
        throw new AuthenticationError('Incorrect credentials');
      }
      // authentication
      const token = signToken(user);
      return { token, user };
    },
    addThought: async (parent, args, context) => {
      if (context.user) {
        const thought = await Thought.create({ ...args, username: context.user.username });
    
        await User.findByIdAndUpdate(
          { _id: context.user._id },
          { $push: { thoughts: thought._id } },
          { new: true }
        );
    
        return thought;
      }
    
      throw new AuthenticationError('You need to be logged in!');
    },
  }
};

module.exports = resolvers;