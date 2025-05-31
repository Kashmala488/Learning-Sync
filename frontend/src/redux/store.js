import { configureStore } from '@reduxjs/toolkit';
import videoCallReducer from './videoCallSlice';

export const store = configureStore({
  reducer: {
    videoCall: videoCallReducer,
  },
});