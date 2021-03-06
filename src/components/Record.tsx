import { Button, Typography } from '@material-ui/core'
import * as React from 'react'
import { Component, FormEvent } from 'react'
import { connect } from 'react-redux'

import { IGlobalState } from '../reducers'
import DeleteRecord from './DeleteRecord'
import Overlay from './Overlay'
import { Utility } from './utility'

interface IPassedProps<T> {
    // the id of the record
    id: string | null
    // the redux store object with all records of the same type, indexed by id
    records: {
        [id: string]: T
    }
    // the record title
    title: string
    // a function to retrieve the record if it isn't already in the redux store
    retrieveRecord: (id: string) => Promise<undefined>
    // a function to take the contents of the form and produce the corresponding record object
    produceRecord: () => T
    // a function to create a new record on the server
    createRecord: (record: T) => Promise<string | undefined>;
    // a function to call once the record is created
    onCreation?: (id?: string) => void
    // a function to send a partial record to the server for updating
    updateRecord: (id: string, update: Partial<T>) => Promise<undefined>
    // a function to delete a record on the server
    deleteRecord: (id: string) => Promise<undefined>
    // a function the indicates whether the record is valid
    onDelete?: () => void
    valid: () => boolean;
}

/**
 * A class to create or update a generic record
 */
class Record<T> extends Component<IProps<T>> {

    public state: IState = {
        pendingAction: false,
        retrieving: this.props.id !== undefined
    }

    /**
     * When the component loads, retrieve the record if it is not available in the redux store
     */
    public componentDidMount(): void {
        const { id, retrieveRecord } = this.props
        if (id && this.getStatus() === RetrievalStatus.RETRIEVING) {
            retrieveRecord(id)
                .catch(() => null) // suppress the error because the action is the same either way
                .then(() => this.setState(() => ({ retrieving: false })))
        }
    }

    public render(): JSX.Element {
        const { id, title, children, authenticated, valid } = this.props
        const { pendingAction } = this.state
        const action = id ? 'update' : 'create'
        switch (this.getStatus()) {
            case RetrievalStatus.RETRIEVING:
                return <h2>Retrieving Record...</h2>
            case RetrievalStatus.UNAVAILABLE:
                return <h2>Record Unavailable</h2>
            case RetrievalStatus.AVAILABLE:
                return (
                    <Typography component={ 'div' }>
                        <Overlay active={ pendingAction } />
                        <h2>{ title }{ id && ` ( ${ id } )` }</h2>
                        <form onSubmit={ this.onSubmit }>
                            { children }
                            { authenticated ?
                                <Button type={ 'submit' }
                                        disabled={ !valid() }
                                        color={ 'primary' }>
                                    { action.toUpperCase() }
                                </Button> :
                                <p>{ `Please sign in to ${ action } the record` }</p>
                            }
                        </form>
                        { authenticated && id && <DeleteRecord id={ id } onDelete={ this.deleteRecord(id) } /> }
                    </Typography>
                )
            default:
                return <h2>Internal Error. Cannot display record</h2>
        }
    }

    /**
     * Return the retrieval status of the record
     */
    private getStatus(): RetrievalStatus {
        const { id, records } = this.props

        if (this.state.retrieving) {
            return RetrievalStatus.RETRIEVING
        }
        return (id && !records[id]) ? RetrievalStatus.UNAVAILABLE : RetrievalStatus.AVAILABLE
    }

    /**
     * Package the component state into a new record (or partial record if we are updating an
     * existing one) and send it to the server for processing
     * @param e the form submission event
     */
    private onSubmit = (e: FormEvent<HTMLFormElement>) => {
        e.preventDefault()
        const { id, records, produceRecord, createRecord, updateRecord, onCreation } = this.props
        const newRecord: T = produceRecord()

        if (id) {
            const update = Utility.subtract(Object(newRecord), Object(records[id]))
            if (Object.getOwnPropertyNames(update).length > 0) {
                this.setPendingAction()
                updateRecord(id, newRecord)
                    .catch(() => null)
                    .then(() => this.clearPendingAction())

            }
        } else {
            this.setPendingAction()
            createRecord(newRecord)
                .catch(() => null)
                .then(newId => {
                    this.clearPendingAction()
                    return newId
                })
                .then(newId => (newId !== null) && onCreation && onCreation(newId))
        }
    }

    /**
     * The DeleteRecord component expects a function with no arguments, but we need to call
     * this.props.deleteRecord with the recipe id.
     * This function simply adds a layer of indirection to get the call signatures to match
     * and then calls the onDelete callback if it is defined
     */
    private deleteRecord = (id: string) => () => {
        this.setPendingAction()
        this.props.deleteRecord(id)
            .catch(() => null)
            .then(() => this.clearPendingAction())
            .then(() => this.props.onDelete && this.props.onDelete())
    }

    /**
     * Set the pendingAction flag
     */
    private setPendingAction = () => this.setState(() => ({ pendingAction: true }))

    /**
     * Clear the pendingAction flag
     */
    private clearPendingAction = () => this.setState(() => ({ pendingAction: false }))
}

enum RetrievalStatus {
    AVAILABLE = 'AVAILABLE',
    RETRIEVING = 'RETRIEVING',
    UNAVAILABLE = 'UNAVAILABLE'
}

type IProps<T> = IPassedProps<T> & {
    authenticated: boolean
}

interface IState {
    retrieving: boolean;
    pendingAction: boolean;
}

const mapStateToProps = (state: IGlobalState) => ({
    authenticated: state.user.profile !== null
})

export default connect(mapStateToProps)(Record)
