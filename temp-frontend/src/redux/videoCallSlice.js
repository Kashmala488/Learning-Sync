import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import axios from 'axios';

const VIDEO_CALL_API_URL = 'http://localhost:4000';

export const getVideoCallRoom = createAsyncThunk(
    'videoCall/getVideoCallRoom',
    async ({ groupId, token }, { rejectWithValue }) => {
        try {
            console.log('Fetching video call room:', groupId);
            const response = await axios.get(`${VIDEO_CALL_API_URL}/api/video-call/room/${groupId}`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            return response.data;
        } catch (error) {
            console.error('Get room error:', {
                status: error.response?.status,
                message: error.response?.data?.error || error.message,
                data: error.response?.data
            });
            return rejectWithValue({
                status: error.response?.status,
                message: error.response?.data?.error || error.message || 'Failed to fetch video call room'
            });
        }
    }
);

export const createVideoCall = createAsyncThunk(
    'videoCall/createVideoCall',
    async ({ groupId, token }, { rejectWithValue, getState }) => {
        try {
            const { auth } = getState();
            const userId = auth.currentUser?.id || 'unknown';
            console.log('Creating video call room:', { groupId, userId });
            const response = await axios.post(
                `${VIDEO_CALL_API_URL}/api/video-call/create`,
                { groupId, userId },
                { headers: { Authorization: `Bearer ${token}` } }
            );
            return response.data;
        } catch (error) {
            console.error('Create room error:', {
                status: error.response?.status,
                message: error.response?.data?.error || error.message,
                data: error.response?.data
            });
            return rejectWithValue({
                status: error.response?.status,
                message: error.response?.data?.error || error.message || 'Failed to create video call room'
            });
        }
    }
);

const videoCallSlice = createSlice({
    name: 'videoCall',
    initialState: {
        roomName: null,
        loading: false,
        error: null
    },
    reducers: {
        resetVideoCall: (state) => {
            state.roomName = null;
            state.loading = false;
            state.error = null;
        }
    },
    extraReducers: (builder) => {
        builder
            .addCase(getVideoCallRoom.pending, (state) => {
                state.loading = true;
                state.error = null;
            })
            .addCase(getVideoCallRoom.fulfilled, (state, action) => {
                state.loading = false;
                state.roomName = action.payload.roomName || `room-${action.payload.groupId}`;
            })
            .addCase(getVideoCallRoom.rejected, (state, action) => {
                state.loading = false;
                state.error = action.payload.message;
            })
            .addCase(createVideoCall.pending, (state) => {
                state.loading = true;
                state.error = null;
            })
            .addCase(createVideoCall.fulfilled, (state, action) => {
                state.loading = false;
                state.roomName = action.payload.roomName || `room-${action.payload.groupId}`;
            })
            .addCase(createVideoCall.rejected, (state, action) => {
                state.loading = false;
                state.error = action.payload.message;
            });
    }
});

export const { resetVideoCall } = videoCallSlice.actions;
export default videoCallSlice.reducer;