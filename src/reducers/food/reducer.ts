import { IFood } from '../../server/interfaces';
import { Action, ActionNames } from './action.types';

export interface IState {
    [id: string]: IFood;
}

/**
 * Handle the UPDATE_ITEMS action (by adding new food items to the state, and replacing existing ones)
 * @param state the state before the items are updated
 * @param action the action to apply
 * @returns the new state after the items have been updated
 */
export default function (state = initialState, action: Action) {
    switch (action.type) {
        case ActionNames.UPDATE_ITEMS:
            const updates = {};
            action.items.map(item => {
                updates[item.id] = item;
            });
            return Object.assign({}, state, updates);
        default:
            return state;
    }
};

const initialState: IState = {};